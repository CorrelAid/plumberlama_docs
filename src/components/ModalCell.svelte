<script>
    import Modal from "@/components/Modal.svelte";
    import Histogram from "@/components/Histogram.svelte";
    import BarChart from "@/components/BarChart.svelte";
    let { title, type, data, metadata} = $props();

    let showModal = $state(false);
</script>

<button class="link-like" onclick={() => (showModal = true)}> {title} </button>



<Modal bind:showModal title={title}>
    {#if type === "dist"}
    <Histogram data={data} metadata={metadata} title={title}></Histogram>
    {:else if type === "cat"}
    <BarChart data={data} metadata={metadata} title={title}></BarChart>
    {/if}
</Modal>

<style>
.link-like {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  color: #0366d6;           /* link-blue; change to match your design */
  text-decoration: underline;
  cursor: pointer;
  font: inherit;            /* matches surrounding text */
  line-height: inherit;
}

/* hover/active states */
.link-like:hover {
  color: #024ea2;
  text-decoration: underline;
}

/* visible focus for keyboard users (don't remove) */
.link-like:focus {
  outline: 3px solid rgba(3,102,214,0.25);
  outline-offset: 2px;
  border-radius: 2px;
}

</style>