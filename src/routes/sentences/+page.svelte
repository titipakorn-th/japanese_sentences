<script lang="ts">
  import { parseFuriganaData } from '$lib/db/queries/sentences';
  import type { Sentence } from '$lib/db/types';
  import { invalidate } from '$app/navigation';
  import Furigana from '$lib/components/Furigana.svelte';
  
  const { data } = $props<{ data: any }>();
  
  const sentences = $derived(data.sentences as Sentence[]);
  const { page, limit } = $derived(data.pagination);
  
  // Function to display a formatted date
  function formatDate(dateStr: Date | string | number) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Function to truncate text
  function truncate(text: string, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  // Function to get the difficulty label
  function getDifficultyLabel(level: number) {
    const labels = [
      'Not Set',
      'Beginner',
      'Elementary',
      'Intermediate',
      'Advanced',
      'Expert'
    ];
    
    return labels[level] || 'Unknown';
  }
  
  // Function to get difficulty class
  function getDifficultyClass(level: number) {
    return `level-${level}`;
  }
  
  // Function to refresh the sentence list
  async function refreshList() {
    await invalidate('sentences:list');
  }
</script>

<div class="sentences-container">
  <header class="page-header">
    <h1>Japanese Sentences</h1>
    <div class="header-actions">
      <button class="btn-secondary" on:click={refreshList}>
        Refresh List
      </button>
      <a href="/sentences/new" class="btn-primary">Add New Sentence</a>
    </div>
  </header>
  
  {#if sentences.length === 0}
    <div class="empty-state">
      <p>No sentences found. Start building your collection by adding new sentences.</p>
      <a href="/sentences/new" class="btn-primary">Add Your First Sentence</a>
    </div>
  {:else}
    <div class="sentence-list">
      {#each sentences as sentence (sentence.sentenceId)}
        <div class="sentence-card">
          <div class="sentence-content">
            <a href="/sentences/{sentence.sentenceId}" class="sentence-text">
              <Furigana 
                text={sentence.sentence} 
                furiganaData={sentence.furiganaData || []} 
              />
            </a>
            
            {#if sentence.translation}
              <p class="translation">{truncate(sentence.translation, 150)}</p>
            {/if}
          </div>
          
          <div class="sentence-meta">
            {#if sentence.difficultyLevel}
              <span class={getDifficultyClass(sentence.difficultyLevel)}>
                {getDifficultyLabel(sentence.difficultyLevel)}
              </span>
            {/if}
            
            {#if sentence.tags}
              <div class="tags">
                {#each sentence.tags.split(',') as tag}
                  <span class="tag">{tag.trim()}</span>
                {/each}
              </div>
            {/if}
            
            <div class="date-added">
              Added: {formatDate(sentence.createdAt)}
            </div>
          </div>
          
          <div class="actions">
            <a href="/sentences/{sentence.sentenceId}" class="btn-secondary">View</a>
            <a href="/sentences/{sentence.sentenceId}/edit" class="btn-secondary">Edit</a>
          </div>
        </div>
      {/each}
    </div>
    
    <div class="pagination">
      {#if page > 1}
        <a href="/sentences?page={page - 1}" class="pagination-link">Previous</a>
      {/if}
      
      <span class="current-page">Page {page}</span>
      
      {#if sentences.length === limit}
        <a href="/sentences?page={page + 1}" class="pagination-link">Next</a>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sentences-container {
    max-width: 960px;
    margin: 0 auto;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .header-actions {
    display: flex;
    gap: 0.75rem;
  }
  
  h1 {
    color: #4a6fa5;
    margin: 0;
  }
  
  .btn-primary {
    background-color: #4a6fa5;
    color: white;
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .btn-primary:hover {
    background-color: #3a5985;
  }
  
  .btn-secondary {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }
  
  .btn-secondary:hover {
    background-color: #ced4da;
  }
  
  .empty-state {
    background-color: white;
    border-radius: 8px;
    padding: 2.5rem 2rem;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .empty-state p {
    margin-bottom: 1.5rem;
    color: #6c757d;
    font-size: 1.1rem;
  }
  
  .sentence-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .sentence-card {
    background-color: white;
    border-radius: 8px;
    padding: 1.2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "content meta"
      "content actions";
    gap: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .sentence-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .sentence-content {
    grid-area: content;
  }
  
  .sentence-meta {
    grid-area: meta;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }
  
  .actions {
    grid-area: actions;
    display: flex;
    gap: 0.5rem;
  }
  
  .sentence-text {
    font-size: 1.1rem;
    color: #212529;
    text-decoration: none;
    font-weight: 500;
    margin-bottom: 0.5rem;
    display: block;
  }
  
  .sentence-text:hover {
    color: #4a6fa5;
  }
  
  .translation {
    color: #6c757d;
    font-size: 0.95rem;
    margin-top: 0.5rem;
    font-style: italic;
  }
  
  .difficulty {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
  }
  
  .level-1 {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .level-2 {
    background-color: #d0ebff;
    color: #1971c2;
  }
  
  .level-3 {
    background-color: #b2f2bb;
    color: #2b8a3e;
  }
  
  .level-4 {
    background-color: #ffec99;
    color: #e67700;
  }
  
  .level-5 {
    background-color: #ffc9c9;
    color: #c92a2a;
  }
  
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
  }
  
  .tag {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  
  .date-added {
    font-size: 0.8rem;
    color: #adb5bd;
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 2rem;
    gap: 1rem;
  }
  
  .pagination-link {
    color: #4a6fa5;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .pagination-link:hover {
    background-color: #e9ecef;
  }
  
  .current-page {
    font-weight: 500;
  }
  
  @media (max-width: 768px) {
    .sentence-card {
      grid-template-columns: 1fr;
      grid-template-areas:
        "content"
        "meta"
        "actions";
    }
    
    .sentence-meta {
      align-items: flex-start;
      margin-top: 0.5rem;
    }
    
    .tags {
      justify-content: flex-start;
    }
  }
</style> 