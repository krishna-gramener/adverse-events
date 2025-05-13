import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";

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

const marked = new Marked();
let token_url=""
let openai_url=""
let gemini_url=""
let token=""
const npi= await fetch('./data/npi.docx').then((r)=>r.text())

// Store the currently uploaded file
let currentFile = null;
let extractedText = '';
let articlesData = [];


function checkStoredAPIs() {
  const stored_token_url = localStorage.getItem('token_url');
  const stored_openai_url = localStorage.getItem('openai_url');
  const stored_gemini_url = localStorage.getItem('gemini_url');
  
  if (stored_token_url && stored_openai_url && stored_gemini_url) {
      token_url = stored_token_url;
      openai_url = stored_openai_url;
      gemini_url = stored_gemini_url;
      return true;
  }
  return false;
}

// Show API form
function showAPIForm() {
  apiForm.classList.remove('hidden');
  mainContent.classList.add('hidden');
}

// Handle API form submission
async function handleAPISubmit(event) {
  event.preventDefault();
  const tokenApiInput = document.getElementById('tokenApi');
  const openaiApiInput = document.getElementById('openaiApi');
  const geminiApiInput = document.getElementById('geminiApi');
  
  token_url = tokenApiInput.value;
  openai_url = openaiApiInput.value;
  gemini_url = geminiApiInput.value;
  
  // Store in localStorage
  localStorage.setItem('token_url', token_url);
  localStorage.setItem('openai_url', openai_url);
  localStorage.setItem('gemini_url', gemini_url);
  
  // Hide form and show main content
  apiForm.classList.add('hidden');
  mainContent.classList.remove('hidden');
  
  // Initialize the app
  await init();
}

async function init() {
  try {
      if (!checkStoredAPIs()) {
          showAPIForm();
          return;
      }
      
      const response = await fetch(token_url, { credentials: "include" });
      const data = await response.json();
      token = data.token;
      
      // Show main content if we have the token
      mainContent.classList.remove('hidden');
      apiForm.classList.add('hidden');
  } catch (error) {
      showError("Failed to initialize: " + error.message);
  }
}

// Add form submit listener
apiForm.addEventListener('submit', handleAPISubmit);

init();


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

  try {
    await processPdf();
  } catch (error) {
    showError(`Error processing PDF: ${error.message}`);
    console.error(error);
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
  processingStatus.classList.remove('hidden');
  resultsContainer.classList.add('hidden');

  // Step 1: Extract text from PDF
  updateStepStatus(1, 'progress');
  try {
    extractedText = await extractTextUsingGemini(currentFile);
    updateStepStatus(1, 'complete');
    displayEntities(extractedText);
    // Step 2: Find related articles
    updateStepStatus(2, 'progress');
    const pubmedLink = await generatePubmedLinks(extractedText);
    articlesData = await fetchArticles(pubmedLink);
    updateStepStatus(2, 'complete');
    displayArticles(articlesData);

    // Step 3: Generate summary
    updateStepStatus(3, 'progress');
    const summary = await generateSummary(extractedText, articlesData);
    updateStepStatus(3, 'complete');
    displaySummary(summary);

    // Show results
    resultsContainer.classList.remove('hidden');

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
    const response = await fetch(
      gemini_url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: `You are a clinical extraction assistant. Extract information from the provided pdf document and return it in the following JSON format:
\`\`\`json
{
  "type": "object",
  "properties": {
    "symptoms": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    },
    "diseases_or_medications": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    },
    "subjective_assessments": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    },
    "drug_used": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  },
  "required": ["symptoms", "diseases_or_medications", "subjective_assessments", "drug_used"]
}
\`\`\`
Ensure the response is valid JSON. Extract all relevant information from the pdf document and categorize it appropriately.`,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: "This is a PDF document" }, 
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: base64String, // Base64 content excluding the prefix
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Unexpected error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Extract JSON content from within ```json ... ``` block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('No JSON block found in response');
    }
    
    try {
      const extractedJson = JSON.parse(jsonMatch[1]);
      console.log(extractedJson)
      return extractedJson;
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }
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
  "searchTerm": "(drugName1+OR+drugName2)+AND+(adverse+effects+OR+side+effects)+AND+(symptom1+OR+symptom2)+AND+(case+study+OR+case+reports)"
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
      const { searchTerm } = JSON.parse(text);
      const pubmedUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${searchTerm}&retmax=5&retmode=json`;
      console.log('Generated PubMed URL:', pubmedUrl);
      return pubmedUrl;
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }
  } catch (error) {
    throw new Error(`Failed to generate PubMed links: ${error.message}`);
  }
}

async function fetchArticles(pubmedApiUrl) {
  try {
    // First fetch the article IDs from the search
    const searchResponse = await fetch(pubmedApiUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.statusText}`);
    }
    
    const searchData = await searchResponse.json();
    const articleIds = searchData.esearchresult?.idlist || [];
    
    if (articleIds.length === 0) {
      return [];
    }

    // Fetch and parse each article's XML data
    const articles = [];
  
    for (const id of articleIds) {
      const articleUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${id}&retmode=xml`;
      let articleResponse='';
      try{
       articleResponse = await fetch(articleUrl);
      }catch(error){
        console.error(`Failed to fetch article ${id}: ${error.message}`);
        continue;
      }
      const xmlText = await articleResponse.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Extract article information
      const article = {
        title: getXmlContent(xmlDoc, 'ArticleTitle') || 'Title not available',
        abstract: getXmlContent(xmlDoc, 'Abstract') || 'Abstract not available',
        authors: getAuthors(xmlDoc),
        journal: getJournalInfo(xmlDoc),
        publicationDate: getPublicationDate(xmlDoc),
        keywords: getKeywords(xmlDoc),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
      };

      articles.push(article);
    }
    return articles;
  } catch (error) {
    throw new Error(`Failed to fetch articles: ${error.message}`);
  }
}

// Helper functions for XML parsing
function getXmlContent(xmlDoc, tagName) {
  return xmlDoc.getElementsByTagName(tagName)[0]?.textContent?.trim();
}

function getAuthors(xmlDoc) {
  const authors = xmlDoc.getElementsByTagName('Author');
  return Array.from(authors).map(author => {
    const lastName = author.getElementsByTagName('LastName')[0]?.textContent || '';
    const foreName = author.getElementsByTagName('ForeName')[0]?.textContent || '';
    return `${lastName}${foreName ? ', ' + foreName : ''}`;
  }).join('; ') || 'Authors not available';
}

function getJournalInfo(xmlDoc) {
  const journal = xmlDoc.getElementsByTagName('Journal')[0];
  if (!journal) return 'Journal information not available';
  
  const title = journal.getElementsByTagName('Title')[0]?.textContent;
  return title || 'Journal title not available';
}

function getPublicationDate(xmlDoc) {
  const pubDate = xmlDoc.getElementsByTagName('PubDate')[0];
  if (!pubDate) return '';

  const year = pubDate.getElementsByTagName('Year')[0]?.textContent || '';
  const month = pubDate.getElementsByTagName('Month')[0]?.textContent || '';
  return `${year}${month ? ' ' + month : ''}`;
}

function getKeywords(xmlDoc) {
  const keywords = xmlDoc.getElementsByTagName('Keyword');
  return Array.from(keywords)
    .map(keyword => keyword.textContent.trim())
    .filter(keyword => keyword)
    .join(', ') || 'No keywords available';
}

async function generateSummary(patientData, articlesData) {
  try {
    const response = await fetch(gemini_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}:adverse-events` },
      credentials: "include",
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: `Generate a comprehensive medical adverse event summary based on this data:

Patient Information: ${JSON.stringify(patientData, null, 2)}
Research Articles: ${JSON.stringify(articlesData, null, 2)}
NPI Guidelines: ${npi}

Provide a detailed analysis using these exact sections:

# Patient Data Summary
- Patient's current condition and medical history
- Timeline of symptoms and their progression
- Current medications and dosage details

# Analysis of Symptoms and Drug Relationship
- Detailed examination of each reported symptom
- Potential causal relationships with medications
- Severity assessment and impact on patient

# Comparison with Documented Cases
- Analysis of similar cases from research articles
- Common patterns in adverse events
- Statistical significance if available

# Evaluation of NPI Guidelines Compliance
- Assessment of current procedures followed
- Areas of compliance with NPI guidelines
- Identification of any procedural gaps

# Key Findings and Concerns
- Major findings from the analysis
- Critical concerns identified
- Risk assessment and severity level

# Recommended Next Steps
- Immediate actions required
- Monitoring requirements
- Follow-up procedures and timeline

Format your response in markdown with proper headings (#) and bullet points (-).`
          }]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.candidates?.[0].content?.parts?.[0]?.text || "Failed to generate summary";
  } catch (error) {
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

function updateStepStatus(step, status) {
  const icon = document.getElementById(`step${step}-icon`);
  const spinner = document.getElementById(`step${step}-spinner`);
  const check = document.getElementById(`step${step}-check`);

  if (status === 'progress') {
    icon.classList.add('hidden');
    spinner.classList.remove('hidden');
    check.classList.add('hidden');
  } else if (status === 'complete') {
    icon.classList.add('hidden');
    spinner.classList.add('hidden');
    check.classList.remove('hidden');
  }
}

function displayEntities(data) {
  try {
    // Parse the JSON string if it's not already an object
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    
    const content = `
      <div class="row g-3">
        ${parsedData.drug_used && parsedData.drug_used.length > 0 ? `
          <div class="col-12">
            <div class="card h-100 border-primary">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0"><i class="bi bi-capsule me-2"></i>Drugs Used</h6>
              </div>
              <div class="card-body">
                <div class="list-group list-group-flush">
                  ${Array.isArray(parsedData.drug_used) ? 
                    parsedData.drug_used.map(drug => `
                      <div class="list-group-item border-0 px-0">
                        <i class="bi bi-dot me-2"></i>${drug}
                      </div>
                    `).join('') : ''}
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${parsedData.symptoms ? `
          <div class="col-md-6">
            <div class="card h-100 border-danger">
              <div class="card-header bg-danger text-white">
                <h6 class="mb-0"><i class="bi bi-activity me-2"></i>Symptoms</h6>
              </div>
              <div class="card-body">
                <div class="list-group list-group-flush">
                  ${Array.isArray(parsedData.symptoms) ? 
                    parsedData.symptoms.map(symptom => `
                      <div class="list-group-item border-0 px-0">
                        <i class="bi bi-dot me-2"></i>${symptom}
                      </div>
                    `).join('') : 
                    `<div class="list-group-item border-0 px-0">
                      <i class="bi bi-dot me-2"></i>${parsedData.symptoms}
                    </div>`
                  }
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${parsedData.diseases_or_medications ? `
          <div class="col-md-6">
            <div class="card h-100 border-warning">
              <div class="card-header bg-warning text-dark">
                <h6 class="mb-0"><i class="bi bi-clipboard2-pulse me-2"></i>Diseases</h6>
              </div>
              <div class="card-body">
                <div class="list-group list-group-flush">
                  ${Array.isArray(parsedData.diseases_or_medications) ? 
                    parsedData.diseases_or_medications.map(item => `
                      <div class="list-group-item border-0 px-0">
                        <i class="bi bi-dot me-2"></i>${item}
                      </div>
                    `).join('') : 
                    `<div class="list-group-item border-0 px-0">
                      <i class="bi bi-dot me-2"></i>${parsedData.diseases_or_medications}
                    </div>`
                  }
                </div>
              </div>
            </div>
          </div>
        ` : ''}
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

function displaySummary(summary) {
  summaryContent.innerHTML = marked.parse(summary);
}

function showFileInfo(file) {
  filename.textContent = file.name;
  fileInfo.classList.remove('hidden');
  uploadArea.classList.add('hidden');
}

function showError(message) {
  errorMessage.textContent = message;
  errorAlert.classList.remove('hidden');
}

function hideError() {
  errorAlert.classList.add('hidden');
}

function resetApp() {
  currentFile = null;
  extractedText = '';
  articlesData = [];
  
  fileInput.value = '';
  filename.textContent = '';
  fileInfo.classList.add('hidden');
  uploadArea.classList.remove('hidden');
  processingStatus.classList.add('hidden');
  resultsContainer.classList.add('hidden');
  errorAlert.classList.add('hidden');
  
  entitiesContent.innerHTML = '';
  articlesContent.innerHTML = '';
  summaryContent.innerHTML = '';
}