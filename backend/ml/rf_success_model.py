import pandas as pd
import numpy as np
import joblib
import os
import json
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (accuracy_score, classification_report,
                              confusion_matrix, roc_auc_score)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

MODEL_DIR = os.path.dirname(__file__)
RF_MODEL_PATH = os.path.join(MODEL_DIR, 'rf_success_model.pkl')
RF_STATS_PATH = os.path.join(MODEL_DIR, 'rf_model_stats.json')
ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoders.pkl')


# ── Feature engineering ────────────────────────────────────────────────────────

def encode_group(group_name):
    """Convert group name to numeric priority score"""
    mapping = {
        'VIP': 5,
        'New Customer': 4,
        'Follow-up': 3,
        'General': 2,
        'Inactive': 1
    }
    return mapping.get(group_name, 2)


def encode_language(language):
    """Convert language code to numeric"""
    mapping = {'en-US': 1, 'hi-IN': 2, 'mr-IN': 3}
    return mapping.get(language, 1)


def encode_sentiment(sentiment):
    """Convert sentiment to numeric score"""
    mapping = {'positive': 1, 'neutral': 0, 'negative': -1}
    return mapping.get(sentiment, 0)


def extract_features(contact_data):
    """
    Extract ML features from contact + campaign data.
    Returns a feature vector.

    Features:
    1. group_priority     — VIP=5, New=4, Follow-up=3, General=2, Inactive=1
    2. language_code      — en=1, hi=2, mr=3
    3. name_length        — length of contact name (longer = more data)
    4. phone_length       — phone number digit count
    5. has_name           — 1 if name provided, 0 if unknown
    6. script_length      — length of campaign script (more detail = better)
    7. campaign_age_days  — how old the campaign is (newer = more urgent)
    8. hour_of_day        — hour when call is made (0-23)
    9. day_of_week        — day of week (0=Mon, 6=Sun)
    10. past_success_rate — campaign's historical positive call rate
    """
    group = contact_data.get('group_name', 'General')
    language = contact_data.get('language', 'en-US')
    name = str(contact_data.get('name', '') or '')
    phone = str(contact_data.get('phone', '') or '')
    script = str(contact_data.get('script', '') or '')
    created_at = contact_data.get('created_at', '')
    past_success_rate = float(contact_data.get('past_success_rate', 0.5))

    import datetime
    now = datetime.datetime.now()
    hour_of_day = now.hour
    day_of_week = now.weekday()

    campaign_age_days = 0
    if created_at:
        try:
            created = pd.to_datetime(created_at)
            campaign_age_days = max(0, (pd.Timestamp.now() - created).days)
        except Exception:
            campaign_age_days = 0

    features = [
        encode_group(group),
        encode_language(language),
        len(name),
        len(phone.replace(' ', '').replace('-', '')),
        1 if name and name.lower() not in ['unknown', '', 'none'] else 0,
        min(len(script.split()), 100),
        min(campaign_age_days, 30),
        hour_of_day,
        day_of_week,
        past_success_rate
    ]

    return features


FEATURE_NAMES = [
    'group_priority',
    'language_code',
    'name_length',
    'phone_digits',
    'has_name',
    'script_word_count',
    'campaign_age_days',
    'hour_of_day',
    'day_of_week',
    'past_success_rate'
]


# ── Synthetic training data ────────────────────────────────────────────────────

def generate_synthetic_data(n_samples=300):
    """
    Generate realistic synthetic training data based on domain knowledge.
    Each sample: [features] → success (1) or failure (0)
    """
    np.random.seed(42)
    X = []
    y = []

    for _ in range(n_samples):
        group_priority = np.random.choice([1, 2, 3, 4, 5],
                                           p=[0.05, 0.30, 0.25, 0.25, 0.15])
        language_code = np.random.choice([1, 2, 3], p=[0.60, 0.25, 0.15])
        name_length = np.random.randint(0, 25)
        phone_digits = np.random.choice([10, 11, 12], p=[0.7, 0.2, 0.1])
        has_name = 1 if name_length > 0 else 0
        script_word_count = np.random.randint(10, 100)
        campaign_age_days = np.random.randint(0, 30)
        hour_of_day = np.random.randint(0, 24)
        day_of_week = np.random.randint(0, 7)
        past_success_rate = np.random.beta(2, 2)

        # Success probability — more balanced
        success_prob = 0.15  # Lower base probability

# Group priority effect
        success_prob += (group_priority - 1) * 0.06  # max +0.24

# Having a name
        success_prob += has_name * 0.08

# Script length
        success_prob += min(script_word_count / 300, 0.08)

# Business hours (9am-6pm)
        if 9 <= hour_of_day <= 18:
           success_prob += 0.10
        else:
           success_prob -= 0.05  # penalty for off-hours

# Weekdays
        if day_of_week < 5:
           success_prob += 0.06
        else:
           success_prob -= 0.08  # weekend penalty

# Past success rate — strongest predictor
        success_prob += past_success_rate * 0.25

# English
        if language_code == 1:
           success_prob += 0.04

# New campaigns
        if campaign_age_days < 7:
           success_prob += 0.04
        elif campaign_age_days > 20:
           success_prob -= 0.03

# Add noise
        success_prob += np.random.normal(0, 0.08)
        success_prob = np.clip(success_prob, 0.05, 0.90)

        outcome = 1 if np.random.random() < success_prob else 0

        X.append([
            group_priority, language_code, name_length, phone_digits,
            has_name, script_word_count, campaign_age_days,
            hour_of_day, day_of_week, past_success_rate
        ])
        y.append(outcome)

    return np.array(X), np.array(y)


# ── Model training ─────────────────────────────────────────────────────────────

def train_rf_model(real_data=None):
    """
    Train Random Forest model on synthetic + real call data.
    real_data: list of (features_dict, label) tuples from Supabase
    """
    print("Training Random Forest Call Success Predictor...")

    # Generate synthetic base data
    X_synth, y_synth = generate_synthetic_data(n_samples=300)

    X_all = list(X_synth)
    y_all = list(y_synth)

    real_samples_used = 0

    # Add real call data if available
    if real_data:
        print(f"Adding {len(real_data)} real call samples...")
        for record in real_data:
            try:
                features = extract_features(record)
                label = record.get('label', 0)
                X_all.append(features)
                y_all.append(label)
                real_samples_used += 1
            except Exception as e:
                print(f"Skipping record: {e}")

    X = np.array(X_all)
    y = np.array(y_all)

    print(f"Total samples: {len(X)}")
    print(f"Success rate: {y.mean():.2%}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Random Forest with tuned hyperparameters
    rf_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )

    rf_model.fit(X_train, y_train)

    # Evaluate
    y_pred = rf_model.predict(X_test)
    y_prob = rf_model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    # 5-fold cross validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf_model, X, y, cv=cv, scoring='accuracy')

    report = classification_report(y_test, y_pred,
                                   target_names=['Failure', 'Success'],
                                   output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    # Feature importance
    feature_importance = []
    for name, importance in zip(FEATURE_NAMES, rf_model.feature_importances_):
        feature_importance.append({
            'feature': name,
            'importance': round(float(importance) * 100, 2)
        })
    feature_importance.sort(key=lambda x: x['importance'], reverse=True)

    stats = {
        'algorithm': 'Random Forest Classifier',
        'n_estimators': 150,
        'max_depth': 8,
        'accuracy': round(accuracy * 100, 2),
        'auc_roc': round(auc * 100, 2),
        'cv_mean': round(cv_scores.mean() * 100, 2),
        'cv_std': round(cv_scores.std() * 100, 2),
        'cv_scores': [round(s * 100, 2) for s in cv_scores.tolist()],
        'report': report,
        'confusion_matrix': cm,
        'feature_importance': feature_importance,
        'total_samples': len(X),
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'real_samples': real_samples_used,
        'synthetic_samples': len(X_synth),
        'class_distribution': {
            'success': int(y.sum()),
            'failure': int(len(y) - y.sum())
        }
    }

    joblib.dump(rf_model, RF_MODEL_PATH)

    with open(RF_STATS_PATH, 'w') as f:
        json.dump(stats, f)

    print(f"RF Model trained! Accuracy: {accuracy:.2%}, AUC: {auc:.2%}")
    print(f"CV Score: {cv_scores.mean():.2%} ± {cv_scores.std():.2%}")

    return stats


def predict_success(contact_data):
    """
    Predict call success probability for a single contact.
    Returns probability score 0-100 and recommendation.
    """
    if not os.path.exists(RF_MODEL_PATH):
        train_rf_model()

    model = joblib.load(RF_MODEL_PATH)
    features = extract_features(contact_data)
    X = np.array([features])

    success_prob = model.predict_proba(X)[0][1]
    score = round(float(success_prob) * 100, 1)

    # Determine tier
    if score >= 70:
        tier = 'High'
        recommendation = 'Call first — high chance of positive response'
        color = 'green'
    elif score >= 45:
        tier = 'Medium'
        recommendation = 'Worth calling — moderate success probability'
        color = 'yellow'
    else:
        tier = 'Low'
        recommendation = 'Low priority — consider a different approach'
        color = 'red'

    # Feature contributions
    model_feature_importance = model.feature_importances_
    contributions = []
    for name, value, importance in zip(FEATURE_NAMES, features, model_feature_importance):
        contributions.append({
            'feature': name,
            'value': round(float(value), 2),
            'importance': round(float(importance) * 100, 1)
        })
    contributions.sort(key=lambda x: x['importance'], reverse=True)

    return {
        'score': score,
        'tier': tier,
        'recommendation': recommendation,
        'color': color,
        'features_used': contributions[:5],
        'raw_probability': round(float(success_prob), 4)
    }


def predict_batch_success(contacts_data):
    """Predict success for multiple contacts and rank them"""
    if not os.path.exists(RF_MODEL_PATH):
        train_rf_model()

    model = joblib.load(RF_MODEL_PATH)
    results = []

    for contact in contacts_data:
        features = extract_features(contact)
        X = np.array([features])
        prob = model.predict_proba(X)[0][1]
        score = round(float(prob) * 100, 1)

        if score >= 70:
            tier = 'High'
            color = 'green'
        elif score >= 45:
            tier = 'Medium'
            color = 'yellow'
        else:
            tier = 'Low'
            color = 'red'

        results.append({
            'id': contact.get('id', ''),
            'name': contact.get('name', 'Unknown'),
            'phone': contact.get('phone', ''),
            'group_name': contact.get('group_name', 'General'),
            'score': score,
            'tier': tier,
            'color': color
        })

    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)

    # Add rank
    for i, r in enumerate(results):
        r['rank'] = i + 1

    return results


def get_rf_stats():
    """Get saved RF model stats"""
    if os.path.exists(RF_STATS_PATH):
        with open(RF_STATS_PATH, 'r') as f:
            return json.load(f)
    return train_rf_model()


if __name__ == '__main__':
    stats = train_rf_model()
    print(f"\nAccuracy: {stats['accuracy']}%")
    print(f"AUC-ROC: {stats['auc_roc']}%")
    print(f"CV: {stats['cv_mean']}% ± {stats['cv_std']}%")
    print("\nTop features:")
    for f in stats['feature_importance'][:5]:
        print(f"  {f['feature']}: {f['importance']}%")

    test_contact = {
        'name': 'Anjali Patil',
        'phone': '9876543210',
        'group_name': 'VIP',
        'language': 'en-US',
        'script': 'Collect feedback from satisfied customers about delivery',
        'past_success_rate': 0.7
    }
    result = predict_success(test_contact)
    print(f"\nTest prediction: {result['score']}% ({result['tier']})")
    print(f"Recommendation: {result['recommendation']}")