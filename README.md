# Adverse Events Analyzer

A web-based tool for analyzing medical documents to identify adverse events, related medications, and relevant research articles.

## Features

### 1. Document Analysis
- Upload and process PDF documents containing medical information
- Extract key medical entities:
  - Medications and drugs
  - Symptoms and side effects
  - Medical conditions and diseases
- Intelligent text processing with advanced NLP capabilities

### 2. Research Integration
- Automatic PubMed article search based on extracted information
- Relevant medical literature discovery
- Direct links to full articles on PubMed
- Smart filtering for case studies and adverse event reports

### 3. Smart Summarization
- Comprehensive case summaries
- Relationship analysis between medications and symptoms
- Key findings highlighting
- Clinical context integration

### 4. User Interface
- Modern, responsive design using Bootstrap 5
- Drag-and-drop file upload
- Real-time processing status indicators
- Clear visualization of results using cards
- Mobile-friendly layout

## Technology Stack

- **Frontend:**
  - HTML5
  - CSS3 (Bootstrap 5.3.2)
  - JavaScript (ES6+)
  - Bootstrap Icons
  - Marked.js for markdown rendering

- **Features:**
  - PDF text extraction
  - Medical entity recognition
  - PubMed integration
  - Intelligent summarization

## Getting Started

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Upload a medical document (PDF format)
4. Wait for the analysis to complete
5. Review the extracted information, related articles, and summary

## Project Structure

```
adverse-events/
├── index.html      # Main application page
├── script.js       # Application logic
├── data/          # Data files
└── .vscode/       # Editor configuration
```

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bootstrap team for the UI framework
- PubMed for medical research access
- Marked.js team for markdown parsing
