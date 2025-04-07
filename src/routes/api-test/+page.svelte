<script lang="ts">
  import { base } from '$app/paths';
  import { createSentenceViaApi } from '$lib/services/api-service';
  import { onMount } from 'svelte';
  
  let sentence = '';
  let translation = '';
  let difficultyLevel = 1;
  let tags = '';
  let submitting = false;
  let error = '';
  let success = '';
  let baseUrl = '';
  let jsExample = '';
  
  onMount(() => {
    // Get the base URL for examples
    baseUrl = window.location.origin + base;
    
    // Create JavaScript example with the correct URL
    jsExample = `// Using Fetch API
const createSentence = async (data) => {
  const response = await fetch('${baseUrl}/api/sentences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  return response.json();
};

// Example usage
createSentence({
  sentence: '日本語の文章です。',
  translation: 'This is a Japanese sentence.',
  difficultyLevel: 2,
  tags: 'example,test'
})
  .then(result => console.log('Created sentence:', result))
  .catch(error => console.error('Error:', error));`;
  });
  
  const difficultyLevels = [
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Elementary' },
    { value: 3, label: 'Intermediate' },
    { value: 4, label: 'Advanced' },
    { value: 5, label: 'Expert' }
  ];
  
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    if (!sentence.trim()) {
      error = 'Sentence text is required';
      return;
    }
    
    submitting = true;
    error = '';
    success = '';
    
    try {
      const result = await createSentenceViaApi({
        sentence,
        translation,
        difficultyLevel,
        tags
      });
      
      if (result.success && result.sentenceId) {
        success = `Sentence created successfully with ID: ${result.sentenceId}`;
        // Reset form after successful submission
        sentence = '';
        translation = '';
        difficultyLevel = 1;
        tags = '';
      } else {
        error = 'Failed to create sentence via API';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      submitting = false;
    }
  }
  
  function getCurlCommand() {
    const jsonData = JSON.stringify({
      sentence,
      translation: translation || undefined,
      difficultyLevel,
      tags: tags || undefined
    }, null, 2);
    
    return `curl -X POST "${baseUrl}/api/sentences" \\
  -H "Content-Type: application/json" \\
  -d '${jsonData}'`;
  }
</script>

<svelte:head>
  <title>Japanese Learning Toolkit - API Test</title>
</svelte:head>

<div class="container">
  <h1>API Test - Create Sentence</h1>
  
  <p class="description">
    This page demonstrates how to create sentences using the API endpoint programmatically. 
    You can use this form to test creating sentences via the API, or see code examples below.
  </p>
  
  <div class="card">
    <h2>Form Test</h2>
    
    <form on:submit={handleSubmit}>
      <div class="form-group">
        <label for="sentence">Japanese Sentence <span class="required">*</span></label>
        <textarea
          id="sentence"
          bind:value={sentence}
          rows="3"
          placeholder="Enter Japanese sentence"
          required
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="translation">English Translation</label>
        <textarea
          id="translation"
          bind:value={translation}
          rows="2"
          placeholder="Enter English translation"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="difficultyLevel">Difficulty Level</label>
          <select 
            id="difficultyLevel" 
            bind:value={difficultyLevel}
          >
            {#each difficultyLevels as level}
              <option value={level.value}>{level.label}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="tags">Tags</label>
          <input
            type="text"
            id="tags"
            bind:value={tags}
            placeholder="e.g. food, travel, JLPT N5 (comma separated)"
          />
        </div>
      </div>
      
      {#if error}
        <div class="error-message">
          <p>{error}</p>
        </div>
      {/if}
      
      {#if success}
        <div class="success-message">
          <p>{success}</p>
        </div>
      {/if}
      
      <div class="form-actions">
        <a href="{base}/sentences" class="button secondary">Back to Sentences</a>
        <button type="submit" class="button primary" disabled={!sentence.trim() || submitting}>
          {submitting ? 'Creating...' : 'Create Sentence via API'}
        </button>
      </div>
    </form>
  </div>
  
  <div class="card">
    <h2>API Usage Examples</h2>
    
    <div class="example">
      <h3>JavaScript/TypeScript Example</h3>
      <pre>{jsExample}</pre>
    </div>
    
    <div class="example">
      <h3>cURL Command</h3>
      <pre>{getCurlCommand()}</pre>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  h1 {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
    color: #4a6fa5;
  }
  
  .description {
    color: #666;
    margin-bottom: 1.5rem;
  }
  
  .card {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  h2 {
    font-size: 1.4rem;
    margin-top: 0;
    margin-bottom: 1rem;
    color: #4a6fa5;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
    width: 100%;
  }
  
  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 768px) {
    .form-row {
      flex-direction: column;
      gap: 0;
    }
  }
  
  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .required {
    color: crimson;
  }
  
  input[type="text"],
  textarea,
  select {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
  }
  
  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    border-left: 4px solid #c62828;
  }
  
  .success-message {
    background-color: #e8f5e9;
    color: #2e7d32;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    border-left: 4px solid #2e7d32;
  }
  
  .form-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 1.5rem;
  }
  
  .button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;
  }
  
  .button.primary {
    background-color: #4a6fa5;
    color: white;
  }
  
  .button.primary:hover:not(:disabled) {
    background-color: #3a5985;
  }
  
  .button.secondary {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .button.secondary:hover {
    background-color: #ced4da;
  }
  
  .button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .example {
    margin-bottom: 1.5rem;
  }
  
  h3 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: #555;
  }
  
  pre {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 0.9rem;
    color: #333;
  }
</style> 