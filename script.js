import { openai_url, gemini_url, token, setupAPI} from './api-config.js';
import {getXmlContent, getAuthors, getJournalInfo, getPublicationDate, getKeywords} from './xml-helper.js';
// DOM elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const fileInfo = document.getElementById('file-info');
const filename = document.getElementById('filename');
const removeFileBtn = document.getElementById('remove-file-btn');
const processingStatus = document.getElementById('processing-status');
const resultsContainer = document.getElementById('results-container');
const entitiesContent = document.getElementById('entities-content');
const articlesContent = document.getElementById('articles-content');
const summaryContent = document.getElementById('summary-content');
const errorAlert = document.getElementById('error-alert');
const errorMessage = document.getElementById('error-message');
const mainContent = document.getElementById('mainContent');
const apiForm = document.getElementById('apiForm');
const pdfModal = document.getElementById('pdfViewerModal');
const pdfIframe = document.getElementById('pdf-iframe');
const viewPdfBtn = document.getElementById('view-pdf-btn');
const modalFilename = document.getElementById('modal-filename');

// Initialize Bootstrap modal
const pdfViewerModal = new bootstrap.Modal(pdfModal);

// Handle view PDF button click
viewPdfBtn.addEventListener('click', () => {
  if (!currentObjectUrl || !currentFile) {
    return;
  }
  modalFilename.textContent = currentFile.name;
  pdfIframe.src = currentObjectUrl;
  pdfViewerModal.show();
});

// Clean up iframe src when modal is hidden
pdfModal.addEventListener('hidden.bs.modal', () => {
  pdfIframe.src = '';
});

const npi= await fetch('./data/npi.docx').then((r)=>r.text())

setupAPI(apiForm, mainContent);
// Store the currently uploaded file
let currentFile = null;
let currentObjectUrl = null;
let extractedText = '';
let articlesData = [];

// Handle file selection
selectFileBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    handleFile(file);
  } else if (file) {
    showError('Please upload a PDF file.');
  }
});

// Handle drag and drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('highlight');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('highlight');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('highlight');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    handleFile(file);
  } else if (file) {
    showError('Please upload a PDF file.');
  }
});

// Remove file
removeFileBtn.addEventListener('click', () => {
  resetApp();
});

// Process the uploaded file
async function handleFile(file) {
  currentFile = file;
  showFileInfo(file);
  hideError();

  // Create object URL for PDF and store it
  currentObjectUrl = URL.createObjectURL(file);
  viewPdfBtn.classList.add('d-none');

  try {
    await processPdf();
  } catch (error) {
    showError(`Error processing PDF: ${error.message}`);
    console.error(error);
    // Clean up object URL on error
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }
}

async function processPdf() {
  // Reset previous results
  extractedText = '';
  articlesData = [];
  entitiesContent.innerHTML = '';
  articlesContent.innerHTML = '';
  summaryContent.innerHTML = '';

  // Show processing status
  processingStatus.classList.remove('d-none');
  resultsContainer.classList.add('d-none');

  // Reset all step statuses
  for (let i = 1; i <= 5; i++) {
    const icon = document.getElementById(`step${i}-icon`);
    const spinner = document.getElementById(`step${i}-spinner`);
    const check = document.getElementById(`step${i}-check`);
    
    icon.classList.remove('d-none');
    spinner.classList.add('d-none');
    check.classList.add('d-none');
  }

  try {
    // Step 1: Process document for text extraction
    updateStepStatus(1, 'progress');
    extractedText = await extractTextUsingGemini(currentFile);
    updateStepStatus(1, 'complete');

    // Step 2: Deconstruct text to identify drugs, diseases and other details
    updateStepStatus(2, 'progress');
    const entities = await displayEntities(extractedText);
    updateStepStatus(2, 'complete');

    // Step 3: Identify related and known adverse events
    updateStepStatus(3, 'progress');
    const pubmedLink = await generatePubmedLinks(extractedText);
    articlesData = await fetchArticles(pubmedLink);
    updateStepStatus(3, 'complete');
    displayArticles(articlesData);

    // Step 4: Identify related articles which indicate causality
    updateStepStatus(4, 'progress');
    const causalityAnalysis = await generateSummary(extractedText, articlesData);
    updateStepStatus(4, 'complete');

    // Step 5: Synthesize and generate final summary
    updateStepStatus(5, 'progress');
    displaySummary(causalityAnalysis);
    updateStepStatus(5, 'complete');

    // Show results and enable PDF viewing
    resultsContainer.classList.remove('d-none');
    viewPdfBtn.classList.remove('d-none');

  } catch (error) {
    showError(`Processing failed: ${error.message}`);
    console.error(error);
  }
}

async function getBase64FromPdf(file) {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the Data-URL prefix (e.g., 'data:application/pdf;base64,')
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  } catch (error) {
    throw new Error(`Failed to convert PDF to base64: ${error.message}`);
  }
}

async function extractTextUsingGemini(file) {
  try {
    const base64String = await getBase64FromPdf(file);
    const requestBody = {
      system_instruction: {
        parts: [{
          text: `You are a clinical extraction assistant. Extract information from the provided pdf document and return it in the following JSON format:\n\`\`\`json\n{\n  "type": "object",\n  "properties": {\n    "symptoms": {\n      "type": "array",\n      "items": {\n        "type": "string"\n      },\n      "minItems": 1\n    },\n    "diseases_or_medications": {\n      "type": "array",\n      "items": {\n        "type": "string"\n      },\n      "minItems": 1\n    },\n    "subjective_assessments": {\n      "type": "array",\n      "items": {\n        "type": "string"\n      },\n      "minItems": 1\n    },\n    "drug_used": {\n      "type": "array",\n      "items": {\n        "type": "string"\n      },\n      "minItems": 1\n    }\n  },\n  "required": ["symptoms", "diseases_or_medications", "subjective_assessments", "drug_used"]\n}\n\`\`\`\nEnsure the response is valid JSON. Extract all relevant information from the pdf document and categorize it appropriately.`
        }]
      },
      contents: [{
        role: "user",
        parts: [
          { text: "This is a PDF document" },
          { inline_data: { mime_type: "application/pdf", data: base64String }}
        ]
      }]
    };

    const response = await fetch(gemini_url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Unexpected error: ${response.status}`);
    }

    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) throw new Error('No JSON block found in response');
    
    return JSON.parse(jsonMatch[1]);
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

async function generatePubmedLinks(extractedData) {
  try {
    const response = await fetch(openai_url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}:adverse-events` 
      },
      credentials: "include",
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [{ 
          role: "system", 
          content: `You are a medical research assistant. Based on the provided data, generate a PubMed search term string that will be used in the eutils API. The search term should focus on:
1. The specific drug used by the patient
2. The side effects or symptoms mentioned
3. The relationship between the drug and symptoms

Format your response as a JSON object with a single 'searchTerm' property containing the search string. Example format:
{
  "searchTerm": "(drugName1+AND+drugName2)+AND+(adverse+effects+OR+side+effects)+OR+(symptom1+OR+symptom2)+OR+(case+study+OR+case+reports)"
}

Ensure terms are properly connected with AND/OR operators and use + for spaces.`
        }, { 
          role: "user", 
          content: JSON.stringify(extractedData) 
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    
    try {
      // Remove escaped quotes and normalize the JSON string
      const cleanText = text.replace(/\\n/g, '').replace(/\\"([^"]+)\\"/g, '"$1"');
      const { searchTerm } = JSON.parse(cleanText);
      const pubmedUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${searchTerm}&retmax=5&retmode=json`;
      console.log('Generated PubMed URL:', pubmedUrl);
      return pubmedUrl;
    } catch (parseError) {
      console.error('Failed to parse text:', text);
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }
  } catch (error) {
    throw new Error(`Failed to generate PubMed links: ${error.message}`);
  }
}

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchArticles(pubmedApiUrl) {
  try {
    const searchResponse = await fetch(pubmedApiUrl);
    if (!searchResponse.ok) throw new Error(`PubMed API error: ${searchResponse.statusText}`);

    const searchData = await searchResponse.json();
    const articleIds = searchData.esearchresult?.idlist || [];
    if (!articleIds.length) return [];

    const articles = [];
    for (const id of articleIds) {
      try {
        // Add a 1-second delay between requests
        await delay(1000);

        const articleUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${id}&retmode=xml`;
        const articleResponse = await fetch(articleUrl);

        if (articleResponse.status === 429) {
          console.log('Rate limited, waiting 2 seconds...');
          await delay(2000); // Wait longer if rate limited
          continue; // Retry this article
        }

        if (!articleResponse.ok) throw new Error(`Article fetch error: ${articleResponse.statusText}`);

        const xmlText = await articleResponse.text();
        const xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');

        articles.push({
          title: getXmlContent(xmlDoc, 'ArticleTitle') || 'Title not available',
          abstract: getXmlContent(xmlDoc, 'Abstract') || 'Abstract not available',
          authors: getAuthors(xmlDoc),
          journal: getJournalInfo(xmlDoc),
          publicationDate: getPublicationDate(xmlDoc),
          keywords: getKeywords(xmlDoc),
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
        });
      } catch (error) {
        console.error(`Failed to fetch article ${id}: ${error.message}`);
        continue; // Skip this article and continue with the next one
      }
    }

    return articles;
  } catch (error) {
    throw new Error(`Failed to fetch articles: ${error.message}`);
  }
}

async function generateSummary(patientData, articlesData) {
  try {
    const requestBody = {
      system_instruction: {
        parts: [{
          text: `Based on the provided data for each symptom, generate details in the following format :

\`\`\`json
[
  {
    "symptom_name": "string",
    "is_adverse_event": "yes|no",
    "reason": "string with explanation"
  }
]
\`\`\`

Provide an array of objects, one for each symptom. For each symptom:
- symptom_name: The name of the symptom
- is_adverse_event: Either "yes" or "no"
- reason: Detailed explanation with references to the provided data
`
        }]
      },
      contents: [{
        role: "user",
        parts: [{
          text: ` data :- 
Patient Information: ${JSON.stringify(patientData, null, 2)}
Research Articles: ${JSON.stringify(articlesData, null, 2)}
NPI Guidelines: ${npi}
`
        }]
      }]
    };

    const response = await fetch(gemini_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}:adverse-events` },
      credentials: "include",
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const text = (await response.json()).candidates?.[0].content?.parts?.[0]?.text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch?.[1]) throw new Error('No valid JSON found in the response');
    
    const jsonStr = jsonMatch[1].trim();
    const result = JSON.parse(jsonStr);
    
    if (!Array.isArray(result)) {
      throw new Error('Expected array of symptom analysis');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

function updateStepStatus(step, status) {
  const elements = ['icon', 'spinner', 'check'].reduce((acc, type) => {
    acc[type] = document.getElementById(`step${step}-${type}`);
    return acc;
  }, {});

  if (status === 'progress') {
    // Reset current and subsequent steps
    for (let i = step; i <= 5; i++) {
      ['icon', 'spinner', 'check'].forEach(type => {
        const el = document.getElementById(`step${i}-${type}`);
        el.classList.toggle('d-none', type !== 'icon');
      });
    }
    // Update current step to show spinner
    elements.icon.classList.add('d-none');
    elements.spinner.classList.remove('d-none');
  } else if (status === 'complete') {
    Object.entries(elements).forEach(([type, el]) => {
      el.classList.toggle('d-none', type !== 'check');
    });
  }
}

function displayEntities(data) {
  try {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

    const createListItems = (items) => {
      if (!items) return '';
      const itemsArray = Array.isArray(items) ? items : [items];
      return itemsArray.map(item => `
        <div class="list-group-item border-0 px-0">
          <i class="bi bi-dot me-2"></i>${item}
        </div>
      `).join('');
    };

    const createCard = (content, title, color, icon) => content ? `
      <div class="${color === 'primary' ? 'col-12' : 'col-md-6'}">
        <div class="card h-100 border-${color}">
          <div class="card-header bg-${color} ${color === 'warning' ? 'text-dark' : 'text-white'}">
            <h6 class="mb-0"><i class="bi bi-${icon} me-2"></i>${title}</h6>
          </div>
          <div class="card-body">
            <div class="list-group list-group-flush">
              ${createListItems(content)}
            </div>
          </div>
        </div>
      </div>
    ` : '';

    const content = `
      <div class="row g-3">
        ${createCard(parsedData.drug_used?.length && parsedData.drug_used, 'Drugs Used', 'primary', 'capsule')}
        ${createCard(parsedData.symptoms, 'Symptoms', 'danger', 'activity')}
        ${createCard(parsedData.diseases_or_medications, 'Diseases', 'warning', 'clipboard2-pulse')}
      </div>
    `;
    
    entitiesContent.innerHTML = content;
  } catch (error) {
    console.error('Error displaying entities:', error);
    entitiesContent.innerHTML = `<div class="alert alert-danger">Error displaying extracted information</div>`;
  }
}

function displayArticles(articles) {
  if (articles.length === 0) {
    articlesContent.innerHTML = '';
    document.getElementById('related-articles-card').classList.add('d-none');
    return;
  }

  const content = `
    <div class="row">
      <div class="col-12">
        ${articles.map((article, index) => `
          <div class="card mb-3">
            <div class="card-body">
              <h6 class="card-title">${index + 1}. ${article.title}</h6>
              <div class="card-text">
                <p class="text-muted mb-2">
                  <strong>Authors:</strong> ${article.authors || 'Not available'}<br>
                  <strong>Journal:</strong> ${article.journal || 'Not available'} ${article.publicationDate ? `(${article.publicationDate})` : ''}
                </p>
                <a href="${article.url}" target="_blank" class="btn btn-sm btn-outline-primary">View on PubMed</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  articlesContent.innerHTML = content;
  document.getElementById('related-articles-card').classList.remove('d-none');
}

function displaySummary(data) {
  const tableHTML = `
  <div class="table-responsive">
    <table class="table table-striped table-hover">
      <thead class="table-primary">
        <tr>
          <th>Symptom</th>
          <th>Adverse Event</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr>
            <td>${item.symptom_name}</td>
            <td>
              <span class="badge ${item.is_adverse_event === 'yes' ? 'bg-danger' : 'bg-success'}">
                ${item.is_adverse_event}
              </span>
            </td>
            <td>${item.reason}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;
summaryContent.innerHTML = tableHTML;
}

function showFileInfo(file) {
  filename.textContent = file.name;
  fileInfo.classList.remove('d-none');
  uploadArea.classList.add('d-none');
}

function showError(message) {
  errorMessage.textContent = message;
  errorAlert.classList.remove('d-none');
}

function hideError() {
  errorAlert.classList.add('d-none');
}

function resetApp() {
  // Clean up object URL
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  currentFile = null;
  extractedText = '';
  articlesData = [];
  
  fileInput.value = '';
  filename.textContent = '';
  fileInfo.classList.add('d-none');
  uploadArea.classList.remove('d-none');
  processingStatus.classList.add('d-none');
  resultsContainer.classList.add('d-none');
  errorAlert.classList.add('d-none');
  if (pdfViewerModal) {
    pdfViewerModal.hide();
  }
  pdfIframe.src = '';
  viewPdfBtn.classList.add('d-none');
  
  entitiesContent.innerHTML = '';
  articlesContent.innerHTML = '';
  summaryContent.innerHTML = '';
}