import pandas as pd
import numpy as np
import joblib
import os
import re
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.pipeline import Pipeline

# Download NLTK data
try:
    nltk.download('stopwords', quiet=True)
    nltk.download('punkt', quiet=True)
    from nltk.corpus import stopwords
    STOPWORDS = set(stopwords.words('english'))
except:
    STOPWORDS = set()

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'sentiment_model.pkl')
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), 'vectorizer.pkl')

# Training data — labeled sentiment examples
TRAINING_DATA = [
    # Positive
    ("yes I am satisfied thank you very much", "positive"),
    ("great service I am happy with the product", "positive"),
    ("wonderful experience loved it will recommend", "positive"),
    ("absolutely fantastic very pleased", "positive"),
    ("yes the delivery was on time and product is good", "positive"),
    ("I am very happy thank you for calling", "positive"),
    ("excellent quality satisfied customer", "positive"),
    ("yes everything is perfect no complaints", "positive"),
    ("I would definitely recommend this to others", "positive"),
    ("very good service quick delivery satisfied", "positive"),
    ("happy with the purchase good quality", "positive"),
    ("yes received the order everything fine", "positive"),
    ("great product good packaging on time", "positive"),
    ("very pleased with the service thank you", "positive"),
    ("I love it best purchase I have made", "positive"),
    ("outstanding service exceeded expectations", "positive"),
    ("yes I am satisfied will buy again", "positive"),
    ("product quality is excellent very happy", "positive"),
    ("good experience overall would recommend", "positive"),
    ("thank you for the great service", "positive"),

    # Negative
    ("terrible service never buying again", "negative"),
    ("very disappointed product is broken", "negative"),
    ("worst experience ever do not recommend", "negative"),
    ("I am angry the delivery was late", "negative"),
    ("product quality is very poor not satisfied", "negative"),
    ("I want a refund this is not acceptable", "negative"),
    ("horrible customer service very rude", "negative"),
    ("the product stopped working after one day", "negative"),
    ("I am very unhappy with this purchase", "negative"),
    ("not satisfied at all waste of money", "negative"),
    ("delivery was wrong item received", "negative"),
    ("product is damaged not as described", "negative"),
    ("very bad experience will not buy again", "negative"),
    ("frustrated with the service no response", "negative"),
    ("extremely disappointed bad quality", "negative"),
    ("do not waste your money bad product", "negative"),
    ("I complained multiple times no help", "negative"),
    ("very poor quality broke within a week", "negative"),
    ("angry about the late delivery no update", "negative"),
    ("worst product ever terrible experience", "negative"),

    # Neutral
    ("okay I received it", "neutral"),
    ("it is fine nothing special", "neutral"),
    ("average product nothing great nothing bad", "neutral"),
    ("received the order it is okay", "neutral"),
    ("product is as described nothing more", "neutral"),
    ("I have no complaints but not impressed", "neutral"),
    ("it works as expected", "neutral"),
    ("delivery was okay product is average", "neutral"),
    ("no response no feedback", "neutral"),
    ("I will think about it", "neutral"),
    ("not sure if I will recommend", "neutral"),
    ("okay experience nothing to complain", "neutral"),
    ("product is decent average quality", "neutral"),
    ("no issues so far but too early to say", "neutral"),
    ("it is what it is nothing special", "neutral"),
    ("product arrived delivery was fine", "neutral"),
    ("no complaints but not outstanding", "neutral"),
    ("average nothing to write home about", "neutral"),
    ("I received it working fine so far", "neutral"),
    ("okay I guess will see how it goes", "neutral"),
]


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = ' '.join([w for w in text.split() if w not in STOPWORDS])
    return text.strip()


def train_model():
    """Train the sentiment model and save it"""
    print("Training sentiment model...")

    df = pd.DataFrame(TRAINING_DATA, columns=['text', 'sentiment'])
    df['text'] = df['text'].apply(clean_text)

    X = df['text']
    y = df['sentiment']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Create pipeline with TF-IDF + Logistic Regression
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),
            min_df=1
        )),
        ('clf', LogisticRegression(max_iter=1000, random_state=42))
    ])

    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    print(f"Model accuracy: {accuracy:.2f}")

    # Save model
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    return {
        "accuracy": round(accuracy * 100, 2),
        "report": report,
        "confusion_matrix": cm,
        "labels": ["negative", "neutral", "positive"],
        "training_samples": len(X_train),
        "test_samples": len(X_test)
    }


def predict_sentiment(text):
    """Predict sentiment of given text"""
    if not os.path.exists(MODEL_PATH):
        train_model()

    pipeline = joblib.load(MODEL_PATH)
    clean = clean_text(text)
    prediction = pipeline.predict([clean])[0]
    probabilities = pipeline.predict_proba([clean])[0]
    classes = pipeline.classes_

    prob_dict = {cls: round(float(prob) * 100, 1) for cls, prob in zip(classes, probabilities)}

    return {
        "sentiment": prediction,
        "confidence": round(float(max(probabilities)) * 100, 1),
        "probabilities": prob_dict
    }


def get_model_stats():
    """Get model performance stats"""
    if not os.path.exists(MODEL_PATH):
        return train_model()

    # Retrain to get fresh stats
    return train_model()


if __name__ == "__main__":
    stats = train_model()
    print(f"Accuracy: {stats['accuracy']}%")
    test = predict_sentiment("I am very happy with the product")
    print(f"Test prediction: {test}")