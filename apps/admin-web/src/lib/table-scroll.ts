export const tableScroll = (y = 'calc(100vh - 360px)') => ({
  x: 'max-content' as const,
  y,
});

export const compactTableScroll = tableScroll('calc(100vh - 460px)');
