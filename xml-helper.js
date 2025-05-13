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

  export {getXmlContent, getAuthors, getJournalInfo, getPublicationDate, getKeywords};