<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import Furigana from '$lib/components/Furigana.svelte';
  
  const { data } = $props<{ data: PageData }>();
  
  // Reactive state
  let mounted = $state(false);
  let sentences = $derived(data.sentences || []);
  
  // Calculate font size based on sentence difficulty level and length
  function getFontSize(difficultyLevel: number | undefined, length: number): string {
    // Default to level 1 if undefined
    const level = difficultyLevel || 1;
    
    // Base size is inversely proportional to difficulty (easier sentences are larger)
    const baseSize = 6 - level;
    
    // Adjust size based on length (shorter sentences get slightly larger font)
    const lengthFactor = Math.max(0.6, Math.min(1.2, 30 / length));
    
    return baseSize * lengthFactor + 'rem';
  }
  
  // Get color based on difficulty level
  function getDifficultyColor(level: number | undefined): string {
    const colors: Record<number, string> = {
      1: '#4a6fa5', // Blue - Easiest
      2: '#3a9c6d', // Green
      3: '#d9a441', // Yellow/Orange
      4: '#e07b39', // Orange
      5: '#c0392b'  // Red - Hardest
    };
    
    // Default to level 1 if undefined
    return colors[level || 1] || colors[1];
  }
  
  // Get random position for the cloud animation effect
  function getRandomPosition() {
    const top = Math.floor(Math.random() * 70) + 10; // 10-80%
    const left = Math.floor(Math.random() * 70) + 10; // 10-80%
    return `top: ${top}%; left: ${left}%;`;
  }
  
  // Get a unique delay for the animation
  function getAnimationDelay() {
    return `animation-delay: ${Math.random() * 10}s;`;
  }
  
  // Add mounted state for animation purposes
  onMount(() => {
    mounted = true;
  });
</script>

<svelte:head>
  <title>Japanese Learning Toolkit - Sentence Cloud</title>
</svelte:head>

<main class:mounted>
  <h1>Japanese Learning Toolkit</h1>
  
  <p class="intro">
    A visualization of {sentences.length} Japanese sentences. 
    <br>
    Larger text indicates easier sentences, colors represent difficulty levels.
  </p>
  
  <div class="sentence-cloud">
    {#if sentences.length > 0}
      {#each sentences as sentence}
        <a 
          href="/sentences/{sentence.sentenceId}" 
          class="sentence-bubble"
          style="
            font-size: {getFontSize(sentence.difficultyLevel, sentence.sentence.length)};
            color: {getDifficultyColor(sentence.difficultyLevel)};
            {getRandomPosition()}
            {getAnimationDelay()}
          "
          data-difficulty={sentence.difficultyLevel}
        >
          {#if sentence.furiganaData}
            <Furigana 
              text={sentence.sentence}
              furiganaData={sentence.furiganaData}
            />
          {:else}
            {sentence.sentence}
          {/if}
        </a>
      {/each}
    {:else}
      <div class="empty-state">
        <p>No sentences found. Add some sentences to see them here!</p>
        <a href="/sentences/new" class="button">Add Your First Sentence</a>
      </div>
    {/if}
  </div>
  
  <div class="actions">
    <a href="/sentences" class="button primary">View All Sentences</a>
    <a href="/sentences/new" class="button secondary">Add New Sentence</a>
  </div>
  
  <div class="legend">
    <h3>Difficulty Levels</h3>
    <div class="legend-items">
      {#each [1, 2, 3, 4, 5] as level}
        <div class="legend-item">
          <span class="color-box" style="background-color: {getDifficultyColor(level)};"></span>
          <span class="level-text">Level {level}</span>
        </div>
      {/each}
    </div>
  </div>
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 80vh;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  
  main.mounted {
    opacity: 1;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .intro {
    text-align: center;
    margin-bottom: 3rem;
    color: #666;
    font-size: 1.1rem;
  }
  
  .sentence-cloud {
    position: relative;
    min-height: 60vh;
    margin-bottom: 2rem;
    border-radius: 12px;
    background-color: #f9f9f9;
    padding: 2rem;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }
  
  .sentence-bubble {
    position: absolute;
    display: inline-block;
    text-decoration: none;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.3s ease;
    opacity: 0.9;
    z-index: 1;
    max-width: 400px;
    text-align: center;
    animation: float 15s ease-in-out infinite;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .sentence-bubble:hover {
    z-index: 10;
    transform: scale(1.1);
    opacity: 1;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    background-color: rgba(255, 255, 255, 0.95);
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    color: #999;
    text-align: center;
  }
  
  .empty-state p {
    margin-bottom: 1.5rem;
    font-size: 1.2rem;
  }
  
  .actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .button.primary {
    background-color: #4a6fa5;
    color: white;
  }
  
  .button.primary:hover {
    background-color: #3a5d97;
  }
  
  .button.secondary {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .button.secondary:hover {
    background-color: #dee2e6;
  }
  
  .legend {
    margin-top: 2rem;
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .legend h3 {
    text-align: center;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    color: #555;
  }
  
  .legend-items {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .color-box {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 3px;
  }
  
  .level-text {
    font-size: 0.9rem;
    color: #555;
  }
  
  @keyframes float {
    0% {
      transform: translate(0, 0);
    }
    25% {
      transform: translate(-10px, 5px);
    }
    50% {
      transform: translate(5px, -5px);
    }
    75% {
      transform: translate(-5px, -10px);
    }
    100% {
      transform: translate(0, 0);
    }
  }
  
  @media (max-width: 768px) {
    .sentence-cloud {
      min-height: 80vh;
    }
    
    .legend-items {
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
  }
</style>
