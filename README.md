# Ollama-Chat

A modern, responsive chat interface for Ollama language models, featuring a ChatGPT-like experience with code highlighting and real-time responses.

## Features

- 💬 Clean, modern UI inspired by ChatGPT
- 💻 Code syntax highlighting for multiple languages
- 📋 One-click code copying
- 💾 Local storage for chat history
- 🔄 Multiple chat sessions management
- ⚡ Real-time responses
- 🎨 Dark theme interface
- 🔍 Sidebar navigation for chat history

## Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Prism.js for code highlighting

### Backend
- Python
- Flask
- Ollama API

## Prerequisites

Before you begin, ensure you have the following installed:
- Python 3.7+
- [Ollama](https://ollama.ai)
- Mistral model for Ollama

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ollama-chat.git
cd ollama-chat
```

2. Install Python dependencies:

```bash
pip install flask requests
```

3. Install and run Ollama:

```bash
# Install Ollama from https://ollama.ai
# Pull the Mistral model
ollama pull mistral
```

## Running the Application

1. Start the Ollama service:

```bash
ollama serve
```

2. Start the Flask application:

```bash
python app.py
```

3. Open your browser and navigate to:

```
http://localhost:5000
```

## Usage

1. **Starting a Chat**
   - Click "New Chat" in the sidebar or start typing
   - Your messages will be saved automatically

2. **Managing Chats**
   - Use the sidebar to switch between different chats
   - Delete chats using the trash icon
   - Chat history is preserved in local storage

3. **Code Features**
   - Code blocks are automatically highlighted
   - Click the copy icon to copy code snippets
   - Supports multiple programming languages

4. **Mobile Usage**
   - Click the menu icon to open/close sidebar
   - Full functionality available on mobile devices

## Development

The project structure is organized as follows:

```
ollama-chat/
├── app.py              # Flask backend
├── static/
│   ├── index.html     # Main HTML
│   ├── styles.css     # Styling
│   └── script.js      # Frontend logic
└── README.md
```

## Configuration

Default settings in `app.py`:
- Ollama API URL: `http://localhost:11434/api`
- Default model: `mistral`
- Server port: `5000`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- UI/UX inspired by ChatGPT
- Built with [Ollama](https://ollama.ai)
- Code highlighting by [Prism.js](https://prismjs.com)
