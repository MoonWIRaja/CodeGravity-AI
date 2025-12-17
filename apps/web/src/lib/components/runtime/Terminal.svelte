<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let terminalContainer: HTMLDivElement;
  let terminal: any = null;
  let fitAddon: any = null;

  onMount(async () => {
    if (!browser) return;

    // Dynamic imports for xterm
    const { Terminal } = await import('xterm');
    const { FitAddon } = await import('xterm-addon-fit');
    const { WebLinksAddon } = await import('xterm-addon-web-links');
    
    // Import xterm CSS
    await import('xterm/css/xterm.css');

    terminal = new Terminal({
      theme: {
        background: '#0D0D0D',
        foreground: '#E0E0E0',
        cursor: '#00D9FF',
        cursorAccent: '#0D0D0D',
        selectionBackground: '#0F3460',
        black: '#0D0D0D',
        red: '#FF4444',
        green: '#00FF41',
        yellow: '#FFE600',
        blue: '#00D9FF',
        magenta: '#FF0080',
        cyan: '#00D9FF',
        white: '#E0E0E0',
        brightBlack: '#555555',
        brightRed: '#FF6666',
        brightGreen: '#33FF66',
        brightYellow: '#FFFF33',
        brightBlue: '#33DDFF',
        brightMagenta: '#FF33AA',
        brightCyan: '#33FFFF',
        brightWhite: '#FFFFFF',
      },
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(terminalContainer);
    fitAddon.fit();

    // Welcome message
    terminal.writeln('\x1b[36m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[36m║  \x1b[32m░▒▓ CODEGRAVITY AI - TERMINAL ▓▒░\x1b[36m                           ║\x1b[0m');
    terminal.writeln('\x1b[36m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.write('\x1b[32m$\x1b[0m ');

    // Handle input
    terminal.onData((data: string) => {
      terminal.write(data);
      // TODO: Connect to WebContainer for actual command execution
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon?.fit();
    });
    resizeObserver.observe(terminalContainer);

    return () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    terminal?.dispose();
  });
</script>

<div class="terminal-container" bind:this={terminalContainer}></div>

<style>
  .terminal-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  :global(.xterm) {
    height: 100%;
    padding: 0.5rem;
  }
</style>
