<script lang="ts">
	import './layout.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="favicon.png" />
	<title>Akimbo Creative Engineering</title>
</svelte:head>

{@render children()}
