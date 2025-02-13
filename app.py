from flask import Flask, request, jsonify, send_from_directory
import requests
import json
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__, static_url_path='')

OLLAMA_API_URL = "http://localhost:11434/api"

# Store chats in memory (replace with database in production)
chats = {}

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    chat_id = data.get('chatId')
    
    logging.info(f"Received message: {message}")
    logging.info(f"Chat ID: {chat_id}")
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    
    try:
        # Test if Ollama is running and responding
        try:
            health_check = requests.get(f"{OLLAMA_API_URL}/version")
            logging.info(f"Ollama health check: {health_check.status_code}")
        except Exception as e:
            logging.error(f"Ollama health check failed: {str(e)}")
            return jsonify({'error': 'Cannot connect to Ollama. Is it running?'}), 503

        # Prepare the request to Ollama
        ollama_data = {
            "model": "mistral",
            "prompt": message,
            "stream": False
        }
        
        logging.info(f"Sending request to Ollama: {ollama_data}")
        response = requests.post(f"{OLLAMA_API_URL}/generate", json=ollama_data)
        logging.info(f"Ollama response status: {response.status_code}")
        logging.info(f"Ollama raw response: {response.text}")
        
        if response.status_code != 200:
            return jsonify({'error': f'Ollama error: {response.text}'}), response.status_code
            
        response_data = response.json()
        ai_response = response_data.get('response', '')
        
        logging.info(f"AI response: {ai_response}")
        
        # Store the chat history
        if chat_id not in chats:
            chats[chat_id] = []
        
        # Add messages to history
        chats[chat_id].extend([
            {'role': 'user', 'content': message, 'timestamp': datetime.now().isoformat()},
            {'role': 'assistant', 'content': ai_response, 'timestamp': datetime.now().isoformat()}
        ])
        
        return jsonify({
            'response': ai_response,
            'chatId': chat_id
        })
        
    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats', methods=['GET'])
def get_chats():
    # Return empty list if no chats exist
    if not chats:
        return jsonify([])
        
    # Return list of all chats
    chat_list = [
        {
            'id': chat_id,
            'messages': messages,
            'preview': messages[-1]['content'] if messages else ''
        }
        for chat_id, messages in chats.items()
    ]
    return jsonify(chat_list)

@app.route('/api/chats/<chat_id>', methods=['GET'])
def get_chat(chat_id):
    if chat_id not in chats:
        return jsonify({'error': 'Chat not found'}), 404
    return jsonify(chats[chat_id])

@app.route('/api/chats/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    if chat_id in chats:
        del chats[chat_id]
    return '', 204

if __name__ == '__main__':
    app.run(debug=True) 