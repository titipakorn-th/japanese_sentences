<script lang="ts">
  import { parseFuriganaData } from '$lib/db/queries/sentences';
  import type { Sentence } from '$lib/db/types';
  import { invalidate } from '$app/navigation';
  import { goto } from '$app/navigation';
  import Furigana from '$lib/components/Furigana.svelte';
  import { base } from '$app/paths';
  
  const { data } = $props<{ data: any }>();
  
  const sentences = $derived(data.sentences as Sentence[]);
  const { page, limit, activeTag } = $derived(data.pagination);
  
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
  
  // Function to filter by tag
  async function filterByTag(tag: string) {
    goto(`${base}/sentences?tag=${encodeURIComponent(tag.trim())}`);
  }
  
  // Function to clear tag filter
  async function clearTagFilter() {
    goto(`${base}/sentences`);
  }
</script>

<div class="sentences-container">
  <header class="page-header">
    <h1>Japanese Sentences</h1>
    <div class="header-actions">
      <button class="btn-secondary" onclick={refreshList}>
        Refresh List
      </button>
      <a href="{base}/sentences/new" class="btn-primary">Add New Sentence</a>
    </div>
  </header>
  
  {#if activeTag}
    <div class="active-filter">
      <span>Filtering by tag: <strong>{activeTag}</strong></span>
      <button class="btn-clear" onclick={clearTagFilter}>Clear Filter</button>
    </div>
  {/if}
  
  {#if sentences.length === 0}
    <div class="empty-state">
      <p>
        {#if activeTag}
          No sentences found with tag "{activeTag}". Try a different tag or clear the filter.
        {:else}
          No sentences found. Start building your collection by adding new sentences.
        {/if}
      </p>
      {#if !activeTag}
        <a href="{base}/sentences/new" class="btn-primary">Add Your First Sentence</a>
      {/if}
    </div>
  {:else}
    <div class="sentence-list">
      {#each sentences as sentence (sentence.sentenceId)}
        <div class="sentence-card">
          <div class="card-content">
            <a href="{base}/sentences/{sentence.sentenceId}" class="sentence-text">
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
                  <button 
                    class="tag {activeTag === tag.trim() ? 'active' : ''}" 
                    onclick={() => filterByTag(tag)}
                  >
                    {tag.trim()}
                  </button>
                {/each}
              </div>
            {/if}
            
            <div class="date-added">
              Added: {formatDate(sentence.createdAt)}
            </div>
          </div>
          
          <div class="card-actions">
            <a href="{base}/sentences/{sentence.sentenceId}" class="btn-secondary">View</a>
            <a href="{base}/sentences/{sentence.sentenceId}/edit" class="btn-secondary">Edit</a>
          </div>
        </div>
      {/each}
    </div>
    
    <div class="pagination">
      {#if page > 1}
        <a href="{base}/sentences?page={page - 1}{activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''}" class="pagination-link">Previous</a>
      {/if}
      
      <span class="current-page">Page {page}</span>
      
      {#if sentences.length === limit}
        <a href="{base}/sentences?page={page + 1}{activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''}" class="pagination-link">Next</a>
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
  
  .active-filter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background-color: #edf2f7;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }
  
  .btn-clear {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.3rem 0.7rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }
  
  .btn-clear:hover {
    background-color: #ced4da;
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
      "actions actions";
    gap: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
    overflow: hidden;
  }
  
  .sentence-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .card-content {
    grid-area: content;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    overflow: hidden;
  }
  
  .japanese-text {
    font-size: 1.5rem;
    line-height: 1.6;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
    margin: 0;
  }
  
  .translation {
    color: #6c757d;
    font-size: 1.1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    margin: 0;
  }
  
  .card-actions {
    grid-area: actions;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .sentence-meta {
    grid-area: meta;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;
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
    border: none;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
  }
  
  .tag:hover {
    background-color: #dee2e6;
  }
  
  .tag.active {
    background-color: #4a6fa5;
    color: white;
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
      padding: 1rem;
      gap: 0.75rem;
    }
    
    .sentence-meta {
      align-items: flex-start;
      margin-top: 0;
    }
    
    .tags {
      justify-content: flex-start;
    }
    
    .japanese-text {
      font-size: 1.3rem;
      line-height: 1.5;
    }
    
    .translation {
      font-size: 1rem;
    }
    
    .filter-container {
      flex-direction: column;
      align-items: stretch;
    }
    
    .filter-field {
      flex: 1;
      margin-right: 0;
      margin-bottom: 0.5rem;
    }
    
    .card-actions {
      margin-top: 0.25rem;
    }
  }
  
  @media (max-width: 480px) {
    .sentence-card {
      padding: 1rem;
    }
    
    .japanese-text {
      font-size: 1.2rem;
      line-height: 1.5;
    }
    
    .tag {
      padding: 0.15rem 0.4rem;
      font-size: 0.75rem;
    }
    
    .sentences-container h1 {
      font-size: 1.5rem;
    }
    
    .pagination {
      flex-wrap: wrap;
    }
    
    .card-actions {
      flex-wrap: wrap;
    }
  }
</style> 