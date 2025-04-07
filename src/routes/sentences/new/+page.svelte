<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  
  const { form } = $props<{ form: any }>();
  
  let sentence = $state('');
  let translation = $state('');
  let difficultyLevel = $state(1);
  let tags = $state('');
  let submitting = $state(false);
  let error = $state('');
  
  const isValid = $derived(sentence.trim().length > 0);
  
  // Difficulty level options
  const difficultyLevels = [
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Elementary' },
    { value: 3, label: 'Intermediate' },
    { value: 4, label: 'Advanced' },
    { value: 5, label: 'Expert' }
  ];
  
  // Handle difficulty change from select element
  function handleDifficultyChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    difficultyLevel = parseInt(select.value);
  }
  
  // Simple form submission handler
  function handleSubmit() {
    console.log('Form submitted with values:', {
      sentence,
      translation,
      difficultyLevel,
      tags
    });
  }
</script>

<div class="new-sentence-container">
  <header>
    <h1>Add New Sentence</h1>
  </header>
  
  <form 
    method="POST"
    use:enhance={({ formData, cancel }) => {
      submitting = true;
      error = '';
      
      // Log form values for debugging
      console.log('Submitting form with values:', {
        sentence: formData.get('sentence'),
        translation: formData.get('translation'),
        difficultyLevel: formData.get('difficultyLevel'),
        tags: formData.get('tags')
      });
      
      return ({ result, update }) => {
        console.log('Form submission result:', result);
        submitting = false;
        
        if (result.type === 'success' || result.type === 'redirect') {
          // For redirects, update the page without preventing navigation
          update({ reset: false });
          console.log('Form submission successful, allowing redirect...');
        } else if (result.type === 'failure') {
          error = result.data?.error?.toString() || 'Failed to add sentence';
          console.error('Form submission failed:', result.data);
        } else if (result.type === 'error') {
          error = 'An unexpected error occurred';
          console.error('Form submission error:', result);
        }
      };
    }}
    on:submit={handleSubmit}
  >
    <div class="form-group">
      <label for="sentence">Japanese Sentence <span class="required">*</span></label>
      <textarea
        id="sentence"
        name="sentence"
        rows="3"
        bind:value={sentence}
        required
        placeholder="Enter Japanese sentence"
      ></textarea>
    </div>
    
    <div class="form-group">
      <label for="translation">English Translation</label>
      <textarea
        id="translation"
        name="translation"
        rows="3"
        bind:value={translation}
        placeholder="Enter English translation"
      ></textarea>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="difficultyLevel">Difficulty Level</label>
        <select id="difficultyLevel" name="difficultyLevel" bind:value={difficultyLevel} on:change={handleDifficultyChange}>
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
          name="tags"
          bind:value={tags}
          placeholder="e.g. food, travel, JLPT N5 (comma separated)"
        />
      </div>
    </div>
    
    {#if form?.error || error}
      <div class="error-message">
        <p>{form?.error || error}</p>
        {#if form?.details}
          <p class="error-details">{form.details}</p>
        {/if}
      </div>
    {/if}
    
    <div class="form-actions">
      <a href="{base}/sentences" class="btn-secondary">Cancel</a>
      <button type="submit" class="btn-primary" disabled={!isValid || submitting}>
        {submitting ? 'Adding...' : 'Add Sentence'}
      </button>
    </div>
  </form>
</div>

<style>
  .new-sentence-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  header {
    margin-bottom: 2rem;
  }
  
  h1 {
    color: #4a6fa5;
    margin: 0;
  }
  
  form {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #495057;
  }
  
  .required {
    color: #e03131;
  }
  
  .error-message {
    background-color: #fff5f5;
    border-left: 3px solid #e03131;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    color: #e03131;
    border-radius: 0 4px 4px 0;
  }
  
  .error-message p {
    margin: 0;
  }
  
  .error-details {
    font-size: 0.9rem;
    margin-top: 0.5rem !important;
    opacity: 0.8;
  }
  
  input, select, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 1rem;
    color: #212529;
    transition: border-color 0.15s;
    font-family: inherit;
  }
  
  input:focus, select:focus, textarea:focus {
    border-color: #4a6fa5;
    outline: none;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .btn-primary {
    background-color: #4a6fa5;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #3a5985;
  }
  
  .btn-primary:disabled {
    background-color: #adb5bd;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .btn-secondary:hover {
    background-color: #ced4da;
  }
  
  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style> 