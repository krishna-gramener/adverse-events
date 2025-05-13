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

- **APIs:**
  - Gemini API for text extraction and summarization
  - OpenAI API for PubMed search term generation
  - PubMed E-utilities for article retrieval

- **Features:**
  - PDF text extraction and base64 encoding
  - Medical entity recognition using LLMs
  - Smart PubMed search term generation
  - XML parsing for PubMed articles
  - Intelligent adverse event analysis
  - Real-time processing with status indicators

## Getting Started

1. Clone the repository
2. Configure your API keys:
   - Set up Gemini API key
   - Set up OpenAI API key
3. Open `index.html` in a modern web browser
4. Enter your API keys in the configuration panel
5. Upload a medical document (PDF format)
6. Wait for the three-step analysis to complete:
   - Text extraction
   - Article search
   - Summary generation
7. Review the extracted information, related articles, and adverse event analysis

## Project Structure

```
adverse-events/
├── index.html          # Main application page
├── script.js           # Main application logic
├── api-config.js       # API configuration and setup
├── xml-helper.js       # XML parsing utilities  
├── data/              # Data files
   └── npi.docx       # NPI guidelines
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

- Google for Gemini API access
- OpenAI for GPT API access
- NCBI for PubMed E-utilities
- Bootstrap team for the UI framework
