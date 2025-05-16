// Process visualization data
const processSteps = [
    { id: 1, label: 'Processing document for text ' },
    { id: 2, label: 'Deconstructing text to identify drugs, diseases and other details ' },
    { id: 3, label: 'Identifying related and known adverse events' },
    { id: 4, label: 'Identifying related articles which indicate causality ' },
    { id: 5, label: 'Synthesizing and generating final summary' }
  ];
  
  const processLinks = processSteps.slice(0, -1).map((step, i) => ({
    source: step.id,
    target: processSteps[i + 1].id
  }));
  
  // Initialize D3 visualization
  let svg, nodes, links;
  
  function initializeVisualization() {
    const container = document.getElementById('process-visualization');
    const width = container.clientWidth;
    const height = 180;
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const nodeRadius = 12;
  
    // Calculate node positions with better spacing
    const stepWidth = (width - margin.left - margin.right) / (processSteps.length - 1);
    const totalWidth = width - margin.left - margin.right;
    
    processSteps.forEach((step, i) => {
      // Use the full width available
      step.x = margin.left + (i * stepWidth);
      step.y = height / 2;
    });
  
    // Set up SVG with padding
    svg = d3.select('#process-visualization')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);
  
    // Clear any existing content
    svg.selectAll('*').remove();
  
    // Create a container group for centering
    const g = svg.append('g')
      .attr('transform', `translate(0, ${margin.top})`)
  
    // Draw links with curves
    links = g.selectAll('.link')
      .data(processLinks)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('x1', d => processSteps.find(s => s.id === d.source).x)
      .attr('y1', d => processSteps.find(s => s.id === d.source).y)
      .attr('x2', d => processSteps.find(s => s.id === d.source).x)
      .attr('y2', d => processSteps.find(s => s.id === d.source).y);
  
    // Draw nodes with labels
    const nodeGroups = g.selectAll('.node-group')
      .data(processSteps)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);
  
    // Add circles with hover effect
    nodes = nodeGroups.append('circle')
      .attr('class', 'node')
      .attr('r', nodeRadius)
      .style('cursor', 'default')
      .on('mouseover', function() {
        d3.select(this).attr('r', nodeRadius * 1.1);
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', nodeRadius);
      });
  
    // Add labels with horizontal layout
    const labels = nodeGroups.append('text')
      .attr('class', 'node-label')
      .attr('y', nodeRadius * 2.5)
      .each(function(d) {
        const text = d.label;
        const words = text.split(' ');
        
        // Split text into lines based on word count and position
        if (words.length > 3 || i === 0 || i === processSteps.length - 1) {
          // For first and last steps, or long text, always split into two lines
          const midpoint = Math.ceil(words.length / 2);
          const line1 = words.slice(0, midpoint).join(' ');
          const line2 = words.slice(midpoint).join(' ');
          
          d3.select(this)
            .append('tspan')
            .attr('x', 0)
            .text(line1);
          
          d3.select(this)
            .append('tspan')
            .attr('x', 0)
            .attr('dy', '1.2em')
            .text(line2);
        } else {
          d3.select(this)
            .append('tspan')
            .attr('x', 0)
            .text(text);
        }
      });
  }
  
  function updateStepStatus(step, status) {
    if (!svg) initializeVisualization();
  
    if (status === 'progress') {
      // Reset all subsequent nodes
      nodes.filter(d => d.id >= step)
        .classed('completed', false);
  
      // Reset all subsequent links
      links.filter(d => d.source >= step)
        .attr('x2', d => processSteps.find(s => s.id === d.source).x)
        .attr('y2', d => processSteps.find(s => s.id === d.source).y);
    } else if (status === 'complete') {
      // Complete current node
      nodes.filter(d => d.id === step)
        .classed('completed', true);
  
      // Animate link to next node if it exists
      if (step < processSteps.length) {
        links.filter(d => d.source === step)
          .transition()
          .duration(1000)
          .attr('x2', d => processSteps.find(s => s.id === d.target).x)
          .attr('y2', d => processSteps.find(s => s.id === d.target).y);
      }
    }
  }

export {initializeVisualization, updateStepStatus};