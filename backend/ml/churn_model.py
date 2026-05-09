import numpy as np
import pandas as pd
import joblib
import os
import json
from sklearn.cluster import KMeans
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (accuracy_score, classification_report,
                              confusion_matrix, silhouette_score)
from sklearn.pipeline import Pipeline

MODEL_DIR = os.path.dirname(__file__)
CHURN_MODEL_PATH = os.path.join(MODEL_DIR, 'churn_model.pkl')
CHURN_STATS_PATH = os.path.join(MODEL_DIR, 'churn_stats.json')
SCALER_PATH = os.path.join(MODEL_DIR, 'churn_scaler.pkl')

CLUSTER_LABELS = {
    0: {'label': 'Engaged', 'color': '#10b981', 'risk': 'Low', 'desc': 'Highly responsive, positive sentiment'},
    1: {'label': 'Neutral', 'color': '#6b7280', 'risk': 'Medium', 'desc': 'Average response, mixed sentiment'},
    2: {'label': 'At Risk', 'color': '#f59e0b', 'risk': 'High', 'desc': 'Low engagement, declining responses'},
    3: {'label': 'Churned', 'color': '#ef4444', 'risk': 'Critical', 'desc': 'No response, negative sentiment'},
}


def extract_contact_features(contact_data):
    """
    Extract behavioral features from contact call history.
    Features designed for churn prediction.
    """
    sentiment_map = {'positive': 1.0, 'neutral': 0.0, 'negative': -1.0}
    group_map = {'VIP': 5, 'New Customer': 4, 'Follow-up': 3, 'General': 2, 'Inactive': 1}

    response_rate = float(contact_data.get('response_rate', 0.5))
    avg_sentiment = float(contact_data.get('avg_sentiment', 0.0))
    call_count = int(contact_data.get('call_count', 1))
    no_response_count = int(contact_data.get('no_response_count', 0))
    avg_duration = float(contact_data.get('avg_duration', 30))
    group_priority = group_map.get(contact_data.get('group_name', 'General'), 2)
    positive_calls = int(contact_data.get('positive_calls', 0))
    negative_calls = int(contact_data.get('negative_calls', 0))

    # Derived features
    engagement_score = response_rate * avg_sentiment + (positive_calls / max(call_count, 1))
    risk_score = (no_response_count / max(call_count, 1)) + max(0, -avg_sentiment)

    return [
        response_rate,
        avg_sentiment,
        call_count,
        no_response_count,
        avg_duration,
        group_priority,
        positive_calls,
        negative_calls,
        engagement_score,
        risk_score
    ]


FEATURE_NAMES = [
    'response_rate', 'avg_sentiment', 'call_count',
    'no_response_count', 'avg_duration', 'group_priority',
    'positive_calls', 'negative_calls', 'engagement_score', 'risk_score'
]


def generate_synthetic_contacts(n=400):
    """Generate realistic contact behavioral data"""
    np.random.seed(42)
    data = []

    for _ in range(n):
        # 4 behavioral archetypes
        archetype = np.random.choice(['engaged', 'neutral', 'at_risk', 'churned'],
                                     p=[0.30, 0.35, 0.20, 0.15])

        if archetype == 'engaged':
            response_rate = np.random.beta(8, 2)
            avg_sentiment = np.random.uniform(0.3, 1.0)
            call_count = np.random.randint(3, 10)
            no_response = np.random.randint(0, 2)
            avg_duration = np.random.uniform(60, 180)
            group = np.random.choice(['VIP', 'New Customer'], p=[0.4, 0.6])
            churn_label = 0

        elif archetype == 'neutral':
            response_rate = np.random.beta(4, 4)
            avg_sentiment = np.random.uniform(-0.2, 0.3)
            call_count = np.random.randint(2, 7)
            no_response = np.random.randint(1, 3)
            avg_duration = np.random.uniform(30, 90)
            group = np.random.choice(['General', 'Follow-up'], p=[0.6, 0.4])
            churn_label = 0

        elif archetype == 'at_risk':
            response_rate = np.random.beta(2, 5)
            avg_sentiment = np.random.uniform(-0.5, 0.0)
            call_count = np.random.randint(1, 5)
            no_response = np.random.randint(2, 5)
            avg_duration = np.random.uniform(15, 45)
            group = np.random.choice(['General', 'Inactive'], p=[0.5, 0.5])
            churn_label = 1

        else:  # churned
            response_rate = np.random.beta(1, 8)
            avg_sentiment = np.random.uniform(-1.0, -0.3)
            call_count = np.random.randint(1, 3)
            no_response = np.random.randint(3, 8)
            avg_duration = np.random.uniform(5, 20)
            group = 'Inactive'
            churn_label = 1

        group_map = {'VIP': 5, 'New Customer': 4, 'Follow-up': 3, 'General': 2, 'Inactive': 1}
        positive_calls = max(0, int(call_count * response_rate * (avg_sentiment + 1) / 2))
        negative_calls = max(0, int(call_count * (1 - response_rate)))
        engagement_score = response_rate * avg_sentiment + (positive_calls / max(call_count, 1))
        risk_score = (no_response / max(call_count, 1)) + max(0, -avg_sentiment)

        features = [
            response_rate, avg_sentiment, call_count, no_response,
            avg_duration, group_map.get(group, 2), positive_calls,
            negative_calls, engagement_score, risk_score
        ]
        data.append(features + [churn_label])

    df = pd.DataFrame(data, columns=FEATURE_NAMES + ['churn_label'])
    return df


def train_churn_model(real_contacts=None):
    """Train K-Means + SVM churn prediction model"""
    print("Training Churn Prediction Model (K-Means + SVM)...")

    df = generate_synthetic_contacts(n=400)

    real_count = 0
    if real_contacts:
        print(f"Adding {len(real_contacts)} real contacts...")
        real_rows = []
        for c in real_contacts:
            try:
                features = extract_contact_features(c)
                label = 1 if c.get('churn_risk', False) else 0
                real_rows.append(features + [label])
                real_count += 1
            except Exception as e:
                print(f"Skipping contact: {e}")

        if real_rows:
            real_df = pd.DataFrame(real_rows, columns=FEATURE_NAMES + ['churn_label'])
            df = pd.concat([df, real_df], ignore_index=True)

    X = df[FEATURE_NAMES].values
    y = df['churn_label'].values

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler, SCALER_PATH)

    # ── K-Means Clustering ──────────────────────────────
    print("Running K-Means clustering (k=4)...")
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10, max_iter=300)
    cluster_labels = kmeans.fit_predict(X_scaled)

    silhouette = silhouette_score(X_scaled, cluster_labels)
    print(f"Silhouette Score: {silhouette:.4f}")

    # PCA for visualization
    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X_scaled)

    pca_points = []
    for i in range(len(X_pca)):
        cluster = int(cluster_labels[i])
        config = CLUSTER_LABELS.get(cluster, CLUSTER_LABELS[0])
        pca_points.append({
            'x': round(float(X_pca[i, 0]), 4),
            'y': round(float(X_pca[i, 1]), 4),
            'cluster': cluster,
            'label': config['label'],
            'color': config['color'],
            'churn': int(y[i])
        })

    # Cluster distribution
    cluster_dist = {}
    for c in range(4):
        mask = cluster_labels == c
        config = CLUSTER_LABELS.get(c, CLUSTER_LABELS[0])
        cluster_dist[config['label']] = {
            'count': int(mask.sum()),
            'color': config['color'],
            'risk': config['risk'],
            'desc': config['desc'],
            'avg_response_rate': round(float(X[mask, 0].mean()), 3),
            'avg_sentiment': round(float(X[mask, 1].mean()), 3),
            'churn_rate': round(float(y[mask].mean() * 100), 1)
        }

    # ── SVM Classifier ──────────────────────────────────
    print("Training SVM classifier...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    svm = SVC(kernel='rbf', C=1.0, gamma='scale',
              probability=True, random_state=42, class_weight='balanced')
    svm.fit(X_train, y_train)

    y_pred = svm.predict(X_test)
    y_prob = svm.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred,
                                   target_names=['Not Churn', 'Churn'],
                                   output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    cv_scores = cross_val_score(svm, X_scaled, y, cv=5, scoring='accuracy')

    # Feature importance via permutation
    feature_importance = []
    base_acc = accuracy_score(y_test, svm.predict(X_test))
    for i, fname in enumerate(FEATURE_NAMES):
        X_perm = X_test.copy()
        np.random.shuffle(X_perm[:, i])
        perm_acc = accuracy_score(y_test, svm.predict(X_perm))
        importance = max(0, base_acc - perm_acc)
        feature_importance.append({'feature': fname, 'importance': round(importance * 100, 2)})

    feature_importance.sort(key=lambda x: x['importance'], reverse=True)

    # Save combined model
    model_data = {
        'kmeans': kmeans,
        'svm': svm,
        'pca': pca,
        'scaler': scaler
    }
    joblib.dump(model_data, CHURN_MODEL_PATH)

    stats = {
        'algorithm': 'K-Means (k=4) + SVM (RBF kernel)',
        'silhouette_score': round(silhouette * 100, 2),
        'svm_accuracy': round(accuracy * 100, 2),
        'cv_mean': round(cv_scores.mean() * 100, 2),
        'cv_std': round(cv_scores.std() * 100, 2),
        'cv_scores': [round(s * 100, 2) for s in cv_scores.tolist()],
        'classification_report': report,
        'confusion_matrix': cm,
        'cluster_distribution': cluster_dist,
        'feature_importance': feature_importance,
        'pca_points': pca_points[:200],
        'pca_variance': [round(float(v * 100), 2) for v in pca.explained_variance_ratio_],
        'total_samples': len(df),
        'real_samples': real_count,
        'synthetic_samples': 400
    }

    with open(CHURN_STATS_PATH, 'w') as f:
        json.dump(stats, f)

    print(f"Churn model trained! Silhouette: {silhouette:.4f}, SVM Accuracy: {accuracy:.2%}")
    return stats


def predict_churn(contact_data):
    """Predict churn risk for a single contact"""
    if not os.path.exists(CHURN_MODEL_PATH):
        train_churn_model()

    model_data = joblib.load(CHURN_MODEL_PATH)
    scaler = model_data['scaler']
    svm = model_data['svm']
    kmeans = model_data['kmeans']

    features = extract_contact_features(contact_data)
    X = np.array([features])
    X_scaled = scaler.transform(X)

    churn_prob = svm.predict_proba(X_scaled)[0][1]
    churn_pred = int(svm.predict(X_scaled)[0])
    cluster = int(kmeans.predict(X_scaled)[0])
    cluster_info = CLUSTER_LABELS.get(cluster, CLUSTER_LABELS[0])

    return {
        'churn_probability': round(float(churn_prob) * 100, 1),
        'churn_prediction': bool(churn_pred),
        'cluster': cluster,
        'cluster_label': cluster_info['label'],
        'cluster_color': cluster_info['color'],
        'risk_level': cluster_info['risk'],
        'cluster_desc': cluster_info['desc'],
        'recommendation': get_recommendation(cluster_info['label'], churn_prob)
    }


def predict_churn_batch(contacts_data):
    """Predict churn for multiple contacts"""
    if not os.path.exists(CHURN_MODEL_PATH):
        train_churn_model()

    model_data = joblib.load(CHURN_MODEL_PATH)
    results = []
    for contact in contacts_data:
        try:
            result = predict_churn(contact)
            result['id'] = contact.get('id', '')
            result['name'] = contact.get('name', 'Unknown')
            result['phone'] = contact.get('phone', '')
            results.append(result)
        except Exception as e:
            print(f"Error predicting for contact: {e}")

    results.sort(key=lambda x: x['churn_probability'], reverse=True)
    for i, r in enumerate(results):
        r['rank'] = i + 1
    return results


def get_recommendation(cluster_label, churn_prob):
    recommendations = {
        'Engaged': 'Keep engaging! Send appreciation messages and offer loyalty rewards.',
        'Neutral': 'Send personalized follow-up. Offer a special discount to increase engagement.',
        'At Risk': 'Urgent: Schedule a priority call. Offer resolution to any complaints.',
        'Churned': 'Last chance: Send a win-back offer with significant incentive.'
    }
    return recommendations.get(cluster_label, 'Monitor this contact carefully.')


def get_churn_stats():
    if os.path.exists(CHURN_STATS_PATH):
        with open(CHURN_STATS_PATH, 'r') as f:
            return json.load(f)
    return train_churn_model()


if __name__ == '__main__':
    stats = train_churn_model()
    print(f"\nSilhouette Score: {stats['silhouette_score']}%")
    print(f"SVM Accuracy: {stats['svm_accuracy']}%")
    print(f"CV Score: {stats['cv_mean']}% ± {stats['cv_std']}%")

    test = {
        'response_rate': 0.2, 'avg_sentiment': -0.5,
        'call_count': 3, 'no_response_count': 4,
        'avg_duration': 15, 'group_name': 'Inactive',
        'positive_calls': 0, 'negative_calls': 2
    }
    result = predict_churn(test)
    print(f"\nTest: {result['cluster_label']} ({result['risk_level']} risk)")
    print(f"Churn probability: {result['churn_probability']}%")