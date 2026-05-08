import re
import os
import json
import math
from collections import Counter, defaultdict

# Manual stopwords (no NLTK download needed)
STOPWORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
    'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
    'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
    'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'of',
    'at', 'by', 'for', 'with', 'about', 'to', 'from', 'in', 'out', 'on',
    'off', 'then', 'so', 'than', 'too', 'very', 's', 't', 'just', 'not',
    'no', 'yes', 'ok', 'okay', 'well', 'um', 'uh', 'hello', 'hi', 'bye',
    'goodbye', 'thank', 'thanks', 'please', 'sorry', 'sure', 'right',
    'good', 'great', 'nice', 'know', 'think', 'want', 'need', 'get',
    'got', 'go', 'going', 'come', 'see', 'like', 'also', 'how', 'when',
    'where', 'why', 'there', 'here', 'now', 'still', 'already', 'just',
    'only', 'even', 'back', 'never', 'always', 'often', 'again', 'more',
    'most', 'some', 'any', 'all', 'both', 'each', 'few', 'other', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'while', 'although', 'however', 'therefore', 'thus', 'hence',
    'response', 'could', 'heard', 'speak', 'speaking', 'called', 'call',
    'calling', 'assistant', 'regarding', 'actually', 'really', 'much',
    'many', 'something', 'anything', 'everything', 'nothing', 'someone',
    'anyone', 'everyone', 'one', 'two', 'three', 'first', 'second', 'third',
    'would', 'make', 'made', 'take', 'taken', 'give', 'given', 'look',
    'seem', 'become', 'keep', 'let', 'put', 'set', 'tell', 'try', 'ask',
    'show', 'feel', 'felt', 'find', 'found', 'leave', 'use', 'used',
    'mean', 'meant', 'might', 'must', 'shall', 'said', 'say', 'says',
    'quite', 'rather', 'enough', 'same', 'different', 'new', 'old', 'big',
    'small', 'long', 'short', 'high', 'low', 'next', 'last', 'little',
    'own', 'every', 'another', 'such', 'number', 'away', 'around',
    'ha', 'hm', 'hmm', 'oh', 'ah', 'no', 'yes', 'yeah', 'yep', 'nope'
}


def clean_text(text):
    """Clean and normalize text"""
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def tokenize(text):
    """Split text into tokens, remove stopwords and short words"""
    words = clean_text(text).split()
    return [w for w in words if w not in STOPWORDS and len(w) > 3]


def extract_contact_speech(conversation):
    """Extract only the contact's words from conversation"""
    if not conversation:
        return ""
    texts = []
    for turn in conversation:
        if isinstance(turn, dict):
            role = turn.get('role', '')
            content = turn.get('content', '')
            if role == 'user' and content and content not in [
                '(no response)', '(could not hear)', '(mic error)',
                '(stopped)', '(not supported)', '(no speech detected)'
            ]:
                texts.append(str(content))
    return ' '.join(texts)


def compute_tfidf(documents):
    """
    Compute TF-IDF scores from scratch.
    documents: list of strings
    Returns: dict of {term: tfidf_score}
    """
    if not documents:
        return {}

    n_docs = len(documents)
    tokenized_docs = [tokenize(doc) for doc in documents]

    # Term frequency per document
    tf_scores = []
    for tokens in tokenized_docs:
        total = len(tokens) if tokens else 1
        tf = Counter(tokens)
        tf_normalized = {term: count / total for term, count in tf.items()}
        tf_scores.append(tf_normalized)

    # Document frequency (how many docs contain each term)
    df = defaultdict(int)
    for tokens in tokenized_docs:
        for term in set(tokens):
            df[term] += 1

    # Inverse document frequency
    idf = {}
    for term, doc_freq in df.items():
        idf[term] = math.log((n_docs + 1) / (doc_freq + 1)) + 1

    # TF-IDF: average across all documents
    tfidf_scores = defaultdict(float)
    for tf in tf_scores:
        for term, tf_val in tf.items():
            tfidf_scores[term] += tf_val * idf.get(term, 1)

    # Normalize by number of documents
    for term in tfidf_scores:
        tfidf_scores[term] /= n_docs

    return dict(tfidf_scores)


def extract_ngrams(text, n=2):
    """Extract n-grams from text"""
    tokens = tokenize(text)
    ngrams = []
    for i in range(len(tokens) - n + 1):
        ngram = ' '.join(tokens[i:i+n])
        ngrams.append(ngram)
    return ngrams


def extract_keywords(transcripts_data, top_n=20):
    """
    Extract top keywords using TF-IDF from all contact speech.
    transcripts_data: list of transcript dicts with 'conversation' field
    """
    # Extract contact speech from each transcript
    documents = []
    for t in transcripts_data:
        conv = t.get('conversation', [])
        speech = extract_contact_speech(conv)
        if speech:
            documents.append(speech)

    if not documents:
        return {
            'keywords': [],
            'bigrams': [],
            'word_frequency': [],
            'total_documents': 0,
            'total_words': 0
        }

    # TF-IDF keywords
    tfidf = compute_tfidf(documents)
    sorted_keywords = sorted(tfidf.items(), key=lambda x: x[1], reverse=True)
    top_keywords = [
        {'word': word, 'score': round(score * 100, 2), 'type': 'tfidf'}
        for word, score in sorted_keywords[:top_n]
        if len(word) > 3
    ]

    # Bigrams (2-word phrases)
    all_bigrams = []
    for doc in documents:
        all_bigrams.extend(extract_ngrams(doc, n=2))

    bigram_counts = Counter(all_bigrams)
    top_bigrams = [
        {'phrase': phrase, 'count': count, 'type': 'bigram'}
        for phrase, count in bigram_counts.most_common(10)
        if count > 1
    ]

    # Raw word frequency
    all_words = []
    for doc in documents:
        all_words.extend(tokenize(doc))

    word_freq = Counter(all_words)
    top_words = [
        {'word': word, 'count': count}
        for word, count in word_freq.most_common(30)
    ]

    total_words = sum(word_freq.values())

    return {
        'keywords': top_keywords,
        'bigrams': top_bigrams,
        'word_frequency': top_words,
        'total_documents': len(documents),
        'total_words': total_words
    }


def extract_topics(transcripts_data, n_topics=5):
    """
    Simple topic extraction using keyword clustering.
    Groups related keywords into topics.
    """
    # Predefined topic categories
    topic_categories = {
        'Delivery & Shipping': [
            'delivery', 'shipping', 'shipped', 'package', 'arrived',
            'received', 'courier', 'dispatch', 'tracking', 'delay',
            'delayed', 'late', 'fast', 'quick', 'speed'
        ],
        'Product Quality': [
            'quality', 'product', 'item', 'material', 'durable',
            'broken', 'damaged', 'defective', 'excellent', 'poor',
            'great', 'bad', 'working', 'works', 'function'
        ],
        'Customer Service': [
            'service', 'support', 'helpful', 'response', 'staff',
            'team', 'agent', 'representative', 'resolved', 'issue',
            'problem', 'complaint', 'feedback', 'experience', 'assist'
        ],
        'Pricing & Value': [
            'price', 'cost', 'expensive', 'cheap', 'affordable',
            'value', 'money', 'worth', 'discount', 'offer',
            'deal', 'refund', 'payment', 'billing', 'charge'
        ],
        'Overall Satisfaction': [
            'satisfied', 'happy', 'pleased', 'disappointed', 'excellent',
            'wonderful', 'terrible', 'amazing', 'horrible', 'recommend',
            'rating', 'review', 'overall', 'experience', 'impression'
        ]
    }

    # Extract all contact speech
    all_speech = []
    for t in transcripts_data:
        conv = t.get('conversation', [])
        speech = extract_contact_speech(conv)
        if speech:
            all_speech.append(speech)

    combined_text = ' '.join(all_speech)
    tokens = tokenize(combined_text)
    word_counts = Counter(tokens)

    # Score each topic
    topic_scores = {}
    topic_keywords_found = {}

    for topic, keywords in topic_categories.items():
        score = 0
        found_keywords = []
        for kw in keywords:
            count = word_counts.get(kw, 0)
            if count > 0:
                score += count
                found_keywords.append({'word': kw, 'count': count})
        topic_scores[topic] = score
        topic_keywords_found[topic] = sorted(
            found_keywords, key=lambda x: x['count'], reverse=True
        )[:5]

    # Sort topics by score
    sorted_topics = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)

    topics = []
    total_score = sum(topic_scores.values()) or 1

    for topic_name, score in sorted_topics:
        if score > 0:
            topics.append({
                'topic': topic_name,
                'score': score,
                'percentage': round((score / total_score) * 100, 1),
                'keywords_found': topic_keywords_found[topic_name],
                'relevance': 'High' if score / total_score > 0.3 else
                             'Medium' if score / total_score > 0.1 else 'Low'
            })

    return {
        'topics': topics,
        'total_topics_found': len([t for t in topics if t['score'] > 0]),
        'dominant_topic': topics[0]['topic'] if topics else 'None'
    }


def named_entity_extraction(transcripts_data):
    """
    Simple named entity extraction using pattern matching.
    Finds: numbers, percentages, time expressions, complaint keywords
    """
    all_speech = ' '.join([
        extract_contact_speech(t.get('conversation', []))
        for t in transcripts_data
    ])

    entities = {
        'numbers': [],
        'time_expressions': [],
        'complaint_phrases': [],
        'positive_phrases': [],
        'quantities': []
    }

    # Numbers and percentages
    numbers = re.findall(r'\b\d+(?:\.\d+)?(?:\s*%|\s*days?|\s*weeks?|\s*months?|\s*hours?|\s*minutes?)?\b',
                         all_speech)
    entities['numbers'] = list(set(numbers))[:10]

    # Time expressions
    time_patterns = re.findall(
        r'\b(?:yesterday|today|tomorrow|last week|this week|next week|'
        r'last month|this month|\d+ days?|\d+ weeks?|\d+ months?|'
        r'morning|evening|afternoon|night)\b',
        all_speech, re.IGNORECASE
    )
    entities['time_expressions'] = list(set(time_patterns))[:10]

    # Complaint phrases
    complaint_words = ['broken', 'damaged', 'wrong', 'missing', 'late', 'never',
                       'problem', 'issue', 'complaint', 'refund', 'angry', 'frustrated',
                       'terrible', 'horrible', 'disappointed', 'worst']
    found_complaints = [w for w in complaint_words if w in all_speech.lower()]
    entities['complaint_phrases'] = found_complaints

    # Positive phrases
    positive_words = ['great', 'excellent', 'perfect', 'amazing', 'wonderful',
                      'fantastic', 'love', 'happy', 'satisfied', 'recommend',
                      'best', 'awesome', 'superb', 'outstanding']
    found_positive = [w for w in positive_words if w in all_speech.lower()]
    entities['positive_phrases'] = found_positive

    # Quantities
    quantities = re.findall(r'\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+'
                            r'(?:items?|products?|orders?|pieces?|units?|boxes?|packages?)\b',
                            all_speech, re.IGNORECASE)
    entities['quantities'] = list(set(quantities))[:5]

    return entities


def generate_word_cloud_data(transcripts_data, top_n=50):
    """
    Generate word cloud data — returns words with sizes for frontend rendering.
    """
    all_speech = []
    for t in transcripts_data:
        conv = t.get('conversation', [])
        speech = extract_contact_speech(conv)
        if speech:
            all_speech.append(speech)

    if not all_speech:
        return []

    all_tokens = []
    for speech in all_speech:
        all_tokens.extend(tokenize(speech))

    word_counts = Counter(all_tokens)
    top_words = word_counts.most_common(top_n)

    if not top_words:
        return []

    max_count = top_words[0][1]

    word_cloud = []
    colors = [
        '#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669',
        '#d97706', '#dc2626', '#9333ea', '#0284c7', '#16a34a'
    ]

    for i, (word, count) in enumerate(top_words):
        # Scale font size between 14 and 48
        size = int(14 + (count / max_count) * 34)
        word_cloud.append({
            'word': word,
            'count': count,
            'size': size,
            'color': colors[i % len(colors)]
        })

    return word_cloud


def analyze_sentiment_by_topic(transcripts_data):
    """
    For each topic, analyze what percentage of mentions are positive vs negative.
    """
    topic_sentiment = {
        'Delivery & Shipping': {'positive': 0, 'negative': 0, 'neutral': 0},
        'Product Quality': {'positive': 0, 'negative': 0, 'neutral': 0},
        'Customer Service': {'positive': 0, 'negative': 0, 'neutral': 0},
        'Pricing & Value': {'positive': 0, 'negative': 0, 'neutral': 0},
        'Overall Satisfaction': {'positive': 0, 'negative': 0, 'neutral': 0},
    }

    topic_keywords = {
        'Delivery & Shipping': ['delivery', 'shipping', 'package', 'arrived', 'received', 'courier'],
        'Product Quality': ['quality', 'product', 'item', 'material', 'broken', 'damaged', 'working'],
        'Customer Service': ['service', 'support', 'helpful', 'staff', 'team', 'resolved'],
        'Pricing & Value': ['price', 'cost', 'expensive', 'affordable', 'value', 'refund'],
        'Overall Satisfaction': ['satisfied', 'happy', 'pleased', 'disappointed', 'recommend'],
    }

    for t in transcripts_data:
        conv = t.get('conversation', [])
        speech = extract_contact_speech(conv).lower()
        sentiment = t.get('sentiment', 'neutral')

        if not speech:
            continue

        for topic, keywords in topic_keywords.items():
            if any(kw in speech for kw in keywords):
                topic_sentiment[topic][sentiment] += 1

    results = []
    for topic, counts in topic_sentiment.items():
        total = sum(counts.values())
        if total > 0:
            results.append({
                'topic': topic,
                'positive': counts['positive'],
                'neutral': counts['neutral'],
                'negative': counts['negative'],
                'total': total,
                'positive_pct': round(counts['positive'] / total * 100, 1),
                'negative_pct': round(counts['negative'] / total * 100, 1),
            })

    return sorted(results, key=lambda x: x['total'], reverse=True)


def full_nlp_analysis(transcripts_data):
    """
    Run complete NLP analysis pipeline on transcript data.
    Returns all analysis results combined.
    """
    if not transcripts_data:
        return {
            'keywords': [],
            'bigrams': [],
            'word_frequency': [],
            'topics': [],
            'entities': {},
            'word_cloud': [],
            'topic_sentiment': [],
            'total_transcripts': 0,
            'total_words': 0,
            'dominant_topic': 'None'
        }

    print(f"Running NLP analysis on {len(transcripts_data)} transcripts...")

    keywords_result = extract_keywords(transcripts_data)
    topics_result = extract_topics(transcripts_data)
    entities = named_entity_extraction(transcripts_data)
    word_cloud = generate_word_cloud_data(transcripts_data)
    topic_sentiment = analyze_sentiment_by_topic(transcripts_data)

    return {
        'keywords': keywords_result.get('keywords', []),
        'bigrams': keywords_result.get('bigrams', []),
        'word_frequency': keywords_result.get('word_frequency', []),
        'topics': topics_result.get('topics', []),
        'entities': entities,
        'word_cloud': word_cloud,
        'topic_sentiment': topic_sentiment,
        'total_transcripts': len(transcripts_data),
        'total_words': keywords_result.get('total_words', 0),
        'dominant_topic': topics_result.get('dominant_topic', 'None')
    }


if __name__ == '__main__':
    # Test with sample data
    sample_transcripts = [
        {
            'conversation': [
                {'role': 'assistant', 'content': 'Hello, how are you?'},
                {'role': 'user', 'content': 'The delivery was very late and product quality is poor'},
                {'role': 'assistant', 'content': 'I understand'},
                {'role': 'user', 'content': 'I am disappointed with the shipping service'}
            ],
            'sentiment': 'negative'
        },
        {
            'conversation': [
                {'role': 'assistant', 'content': 'Hello there'},
                {'role': 'user', 'content': 'Great product excellent quality fast delivery very satisfied'},
                {'role': 'assistant', 'content': 'Wonderful'},
                {'role': 'user', 'content': 'I would definitely recommend this product to friends'}
            ],
            'sentiment': 'positive'
        },
        {
            'conversation': [
                {'role': 'assistant', 'content': 'Hi'},
                {'role': 'user', 'content': 'Product is okay delivery was fine nothing special about customer service'},
                {'role': 'assistant', 'content': 'Thank you'},
                {'role': 'user', 'content': 'Price seems reasonable for average quality product'}
            ],
            'sentiment': 'neutral'
        }
    ]

    result = full_nlp_analysis(sample_transcripts)
    print(f"\nTop keywords: {[k['word'] for k in result['keywords'][:5]]}")
    print(f"Dominant topic: {result['dominant_topic']}")
    print(f"Topics found: {[t['topic'] for t in result['topics']]}")
    print(f"Word cloud words: {len(result['word_cloud'])}")