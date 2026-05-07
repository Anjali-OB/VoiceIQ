import pandas as pd
import numpy as np
import joblib
import os
import re
import json
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (accuracy_score, classification_report,
                              confusion_matrix, precision_recall_fscore_support)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

try:
    nltk.download('stopwords', quiet=True)
    nltk.download('punkt', quiet=True)
    from nltk.corpus import stopwords
    STOPWORDS = set(stopwords.words('english'))
except:
    STOPWORDS = set()

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, 'sentiment_model.pkl')
STATS_PATH = os.path.join(MODEL_DIR, 'model_stats.json')

# Large labeled training dataset
TRAINING_DATA = [
    # POSITIVE samples (40)
    ("yes I am very satisfied thank you", "positive"),
    ("great service loved the product will buy again", "positive"),
    ("excellent quality fast delivery happy customer", "positive"),
    ("yes received the order everything is perfect", "positive"),
    ("very pleased with my purchase recommend to everyone", "positive"),
    ("fantastic experience exceeded my expectations", "positive"),
    ("product works great very good quality satisfied", "positive"),
    ("yes delivery was on time product is amazing", "positive"),
    ("I love it best purchase I made this year", "positive"),
    ("outstanding support team resolved my issue quickly", "positive"),
    ("very happy with the service will definitely return", "positive"),
    ("good packaging product arrived safely excellent", "positive"),
    ("yes I would recommend this to all my friends", "positive"),
    ("product quality is top notch very satisfied customer", "positive"),
    ("thank you for the wonderful experience everything great", "positive"),
    ("happy with everything no complaints great service", "positive"),
    ("yes satisfied completely quick delivery good product", "positive"),
    ("excellent customer care very responsive team", "positive"),
    ("product is exactly as described very happy", "positive"),
    ("great value for money totally satisfied", "positive"),
    ("yes the item is perfect works exactly as expected", "positive"),
    ("loved the packaging and the product quality superb", "positive"),
    ("very good experience with this company will buy more", "positive"),
    ("received my order promptly very happy with quality", "positive"),
    ("absolutely love this product highly recommend", "positive"),
    ("yes everything was smooth from order to delivery", "positive"),
    ("satisfied with the purchase great customer service", "positive"),
    ("product is wonderful thank you so much", "positive"),
    ("very impressed with quality and speed of delivery", "positive"),
    ("yes happy will tell friends to buy from here", "positive"),
    ("excellent product meets all my requirements", "positive"),
    ("great experience overall happy with everything", "positive"),
    ("yes received correctly works perfectly satisfied", "positive"),
    ("good product good service happy customer", "positive"),
    ("very satisfied with the result will order again", "positive"),
    ("product quality exceeded expectations very pleased", "positive"),
    ("yes everything fine good packaging good product", "positive"),
    ("happy with service delivery and product quality all good", "positive"),
    ("excellent will definitely purchase again very satisfied", "positive"),
    ("yes I am delighted with the product and service", "positive"),

    # NEGATIVE samples (40)
    ("very disappointed product is broken not working", "negative"),
    ("terrible service worst experience ever avoid", "negative"),
    ("product quality is extremely poor do not buy", "negative"),
    ("I want a refund this product is defective", "negative"),
    ("angry about late delivery no communication at all", "negative"),
    ("horrible experience product not as described", "negative"),
    ("completely useless product waste of money", "negative"),
    ("very unhappy delivery was wrong item received", "negative"),
    ("customer service is rude not helpful at all", "negative"),
    ("product stopped working after just two days", "negative"),
    ("extremely frustrated with this company very bad", "negative"),
    ("not satisfied at all quality is very poor", "negative"),
    ("terrible packaging product arrived damaged broken", "negative"),
    ("I am very angry never buying from here again", "negative"),
    ("worst purchase I ever made complete waste of money", "negative"),
    ("delivery was three weeks late no update given", "negative"),
    ("product is nothing like the pictures shown fake", "negative"),
    ("very bad quality broke within a week terrible", "negative"),
    ("do not buy this product it is a scam", "negative"),
    ("I complained multiple times still no resolution", "negative"),
    ("extremely disappointed with quality and service both", "negative"),
    ("product does not work as advertised very bad", "negative"),
    ("horrible customer support no response to emails", "negative"),
    ("very poor experience will never order again angry", "negative"),
    ("damaged product received still waiting for replacement", "negative"),
    ("this is the worst product I have ever bought", "negative"),
    ("completely dissatisfied want my money back now", "negative"),
    ("product quality is unacceptable very disappointed", "negative"),
    ("late delivery wrong item terrible customer service", "negative"),
    ("fraud company sent fake product demanding refund", "negative"),
    ("very angry no response from support team", "negative"),
    ("product broke on first use total waste of money", "negative"),
    ("pathetic service delivery damaged product no help", "negative"),
    ("extremely unhappy will report this company fraud", "negative"),
    ("worst quality product ever seen very bad experience", "negative"),
    ("not what I ordered wrong product sent angry", "negative"),
    ("product is defective and company ignores complaints", "negative"),
    ("very dissatisfied nothing works as promised bad", "negative"),
    ("terrible I regret buying this will not recommend", "negative"),
    ("I am furious product failed immediately refund needed", "negative"),

    # NEUTRAL samples (40)
    ("okay I received the order it is average", "neutral"),
    ("product is fine nothing special delivery was okay", "neutral"),
    ("received the item works as expected nothing more", "neutral"),
    ("it is what I expected neither good nor bad", "neutral"),
    ("average quality product delivered on time", "neutral"),
    ("no complaints but nothing impressive either", "neutral"),
    ("product arrived fine will see how it performs", "neutral"),
    ("okay experience delivery was slightly delayed", "neutral"),
    ("product is decent but nothing extraordinary", "neutral"),
    ("received order it is working fine so far", "neutral"),
    ("average service delivery took normal time", "neutral"),
    ("product is okay meets basic requirements", "neutral"),
    ("no issues with delivery product is as described", "neutral"),
    ("it is alright nothing to write home about", "neutral"),
    ("received the order it is what it is", "neutral"),
    ("okay product average quality normal delivery", "neutral"),
    ("no strong feelings product is just okay", "neutral"),
    ("received correctly product is average quality", "neutral"),
    ("delivery was fine product is acceptable", "neutral"),
    ("it works as expected nothing more nothing less", "neutral"),
    ("okay I guess the product is functional", "neutral"),
    ("average experience delivery and product both okay", "neutral"),
    ("received the item it is neither good nor bad", "neutral"),
    ("no response no particular feedback neutral", "neutral"),
    ("product is adequate for basic use nothing special", "neutral"),
    ("delivery was normal product is average", "neutral"),
    ("okay nothing to complain about but not impressed", "neutral"),
    ("product arrived in time quality is average", "neutral"),
    ("fine product meets minimum expectations okay", "neutral"),
    ("received it working fine no complaints no praise", "neutral"),
    ("average as expected nothing surprising", "neutral"),
    ("product is okay I suppose will see long term", "neutral"),
    ("delivery was acceptable product quality is average", "neutral"),
    ("nothing special about this product just okay", "neutral"),
    ("received the order it is usable average quality", "neutral"),
    ("okay product okay delivery okay experience overall", "neutral"),
    ("no issues so far product seems average", "neutral"),
    ("received correctly product is functional okay", "neutral"),
    ("average everything delivery product and service", "neutral"),
    ("it is fine I guess no major complaints", "neutral"),
]


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    words = text.split()
    words = [w for w in words if w not in STOPWORDS and len(w) > 2]
    return ' '.join(words).strip()


def extract_conversation_text(conversation):
    """Extract only user/contact speech from conversation"""
    if not conversation:
        return ""

    user_texts = []
    for turn in conversation:
        if isinstance(turn, dict):
            role = turn.get('role', '')
            content = turn.get('content', '')
            if role == 'user' and content and content not in [
                '(no response)', '(could not hear)',
                '(mic error)', '(stopped)', '(not supported)'
            ]:
                user_texts.append(str(content))

    return ' '.join(user_texts)


def train_model(custom_data=None):
    """Train sentiment model with optional custom data from Supabase"""
    print("Starting ML model training...")

    data = TRAINING_DATA.copy()

    # Add custom data from real calls if provided
    if custom_data:
        print(f"Adding {len(custom_data)} real call samples to training data")
        data.extend(custom_data)

    df = pd.DataFrame(data, columns=['text', 'sentiment'])
    df['text'] = df['text'].apply(clean_text)
    df = df[df['text'].str.len() > 0]

    print(f"Total training samples: {len(df)}")
    print(f"Class distribution:\n{df['sentiment'].value_counts()}")

    X = df['text']
    y = df['sentiment']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Build ensemble pipeline
    lr = LogisticRegression(max_iter=1000, random_state=42, C=1.0)
    nb = MultinomialNB(alpha=0.1)

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=2000,
            ngram_range=(1, 3),
            min_df=1,
            sublinear_tf=True
        )),
        ('clf', lr)
    ])

    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    # Cross validation
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring='accuracy')

    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred,
                          labels=['negative', 'neutral', 'positive']).tolist()

    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average='weighted'
    )

    stats = {
        "accuracy": round(accuracy * 100, 2),
        "cv_mean": round(cv_scores.mean() * 100, 2),
        "cv_std": round(cv_scores.std() * 100, 2),
        "cv_scores": [round(s * 100, 2) for s in cv_scores.tolist()],
        "precision": round(precision * 100, 2),
        "recall": round(recall * 100, 2),
        "f1_score": round(f1 * 100, 2),
        "report": report,
        "confusion_matrix": cm,
        "labels": ["negative", "neutral", "positive"],
        "total_samples": len(df),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "custom_samples": len(custom_data) if custom_data else 0,
        "algorithm": "Logistic Regression + TF-IDF (n-gram 1-3)",
        "features": 2000
    }

    joblib.dump(pipeline, MODEL_PATH)

    with open(STATS_PATH, 'w') as f:
        json.dump(stats, f)

    print(f"Model trained! Accuracy: {accuracy:.2%}, CV: {cv_scores.mean():.2%} ± {cv_scores.std():.2%}")
    return stats


def predict_sentiment(text):
    """Predict sentiment with confidence scores"""
    if not os.path.exists(MODEL_PATH):
        train_model()

    pipeline = joblib.load(MODEL_PATH)
    clean = clean_text(text)

    if not clean:
        return {
            "sentiment": "neutral",
            "confidence": 50.0,
            "probabilities": {"negative": 33.3, "neutral": 33.4, "positive": 33.3},
            "input_length": 0
        }

    prediction = pipeline.predict([clean])[0]
    probabilities = pipeline.predict_proba([clean])[0]
    classes = pipeline.classes_

    prob_dict = {}
    for cls, prob in zip(classes, probabilities):
        prob_dict[cls] = round(float(prob) * 100, 1)

    return {
        "sentiment": prediction,
        "confidence": round(float(max(probabilities)) * 100, 1),
        "probabilities": prob_dict,
        "input_length": len(clean.split()),
        "cleaned_text": clean
    }


def predict_batch(texts):
    """Predict sentiment for multiple texts at once"""
    if not os.path.exists(MODEL_PATH):
        train_model()

    pipeline = joblib.load(MODEL_PATH)
    results = []

    for text in texts:
        clean = clean_text(text)
        if not clean:
            results.append({
                "sentiment": "neutral",
                "confidence": 50.0,
                "probabilities": {"negative": 33.3, "neutral": 33.4, "positive": 33.3}
            })
            continue

        pred = pipeline.predict([clean])[0]
        probs = pipeline.predict_proba([clean])[0]
        classes = pipeline.classes_

        results.append({
            "sentiment": pred,
            "confidence": round(float(max(probs)) * 100, 1),
            "probabilities": {cls: round(float(p) * 100, 1) for cls, p in zip(classes, probs)}
        })

    return results


def get_model_stats():
    """Get saved model stats or train fresh"""
    if os.path.exists(STATS_PATH):
        with open(STATS_PATH, 'r') as f:
            return json.load(f)
    return train_model()


if __name__ == "__main__":
    stats = train_model()
    print(f"\nAccuracy: {stats['accuracy']}%")
    print(f"CV Score: {stats['cv_mean']}% ± {stats['cv_std']}%")

    tests = [
        "I am very happy with the product",
        "terrible service very disappointed",
        "okay product nothing special"
    ]
    for t in tests:
        r = predict_sentiment(t)
        print(f"\nText: {t}")
        print(f"Prediction: {r['sentiment']} ({r['confidence']}%)")