function Icon({ name, className = 'h-5 w-5' }) {
  const shared = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
    cart: <><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.7 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 8H5"/></>,
    wrench: <><path d="M14.7 6.3a5 5 0 0 0-6.6 6.6L3 18a2.1 2.1 0 1 0 3 3l5.1-5.1a5 5 0 0 0 6.6-6.6l-3 3-3-3 3-3Z"/><path d="m19 3 2 2-4 4-2-2 4-4Z"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M8 15V9m5 6V5m5 10v-4"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  }
  return <svg {...shared}>{paths[name]}</svg>
}

export default Icon
