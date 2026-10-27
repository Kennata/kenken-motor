import { useState } from 'react'
import Icon from '../components/Icon'

function MotorcycleIllustration() {
  return (
    <svg className="motorcycle-art" viewBox="0 0 600 430" fill="none" role="img" aria-label="Ilustrasi motor berwarna kuning">
      <defs>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="matrix(0 205 -260 0 300 235)" gradientUnits="userSpaceOnUse"><stop stopColor="#dfff00" stopOpacity=".16"/><stop offset="1" stopColor="#dfff00" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="302" cy="236" rx="260" ry="205" fill="url(#glow)"/>
      <path d="M70 337h462" stroke="#55545b" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="185" cy="305" r="70" stroke="#d7d7dc" strokeWidth="13"/><circle cx="185" cy="305" r="25" stroke="#dfff00" strokeWidth="7"/>
      <circle cx="455" cy="305" r="70" stroke="#d7d7dc" strokeWidth="13"/><circle cx="455" cy="305" r="25" stroke="#dfff00" strokeWidth="7"/>
      <path d="M185 305h117l48-103h82l43 103" stroke="#f4f3f0" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m314 202-36 101m40-101 79 100" stroke="#f4f3f0" strokeWidth="8" strokeLinecap="round"/>
      <path d="m241 212 22-60h116l43 60-63 60-119-33 1-27Z" fill="#dfff00" stroke="#121214" strokeWidth="4" strokeLinejoin="round"/>
      <path d="m263 152 16-45h95l36 45H263Z" fill="#77767e"/>
      <path d="M284 107h89l32 34m-14 0h50l29 32m-15-57h74" stroke="#f4f3f0" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M262 152h-75l-32 46h95m-28 0 37 62m-72-82H95" stroke="#f4f3f0" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M278 107h46l20 25" stroke="#d9d9de" strokeWidth="8" strokeLinecap="round"/><path d="M342 151h73" stroke="#dfff00" strokeWidth="3" strokeLinecap="round" opacity=".75"/>
    </svg>
  )
}

const features = [
  { icon: 'box', title: 'Stok real-time', description: 'Pantau stok masuk, keluar, dan minimum secara akurat.' },
  { icon: 'cart', title: 'Purchase Order', description: 'Belanja ke supplier menjadi lebih rapi dan terkendali.' },
  { icon: 'wrench', title: 'Work Order', description: 'Catat servis dan penggunaan spare part tanpa repot.' },
  { icon: 'chart', title: 'Laporan lengkap', description: 'Ambil keputusan dengan data yang mudah dipahami.' },
]

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="min-h-screen overflow-hidden bg-[#18181a] text-white">
      <div className="mx-auto max-w-[1280px] px-5 pb-12 sm:px-8 lg:px-12 lg:pb-16">
        <header className="relative flex h-[88px] items-center justify-between">
          <a className="flex items-center gap-3 text-[18px] font-semibold tracking-[-.04em]" href="#home" aria-label="KEN-KEN Motor beranda"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#dfff00] text-black"><Icon name="wrench" className="h-[18px] w-[18px]" /></span><span>KEN-KEN Motor</span></a>
          <nav className={`${menuOpen ? 'absolute left-0 right-0 top-[76px] z-20 flex flex-col rounded-2xl border border-white/10 bg-[#202023] p-4 shadow-xl' : 'hidden'} gap-6 text-[12px] text-[#aaa9b0] md:static md:flex md:flex-row md:items-center md:bg-transparent md:p-0 md:shadow-none`}>
            <a className="transition hover:text-white" href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a><a className="transition hover:text-white" href="#solusi" onClick={() => setMenuOpen(false)}>Solusi</a><a className="transition hover:text-white" href="#tentang" onClick={() => setMenuOpen(false)}>Tentang Kami</a>
          </nav>
          <div className="flex items-center gap-3"><a href="/login" className="rounded-full border border-[#4c4b53] px-6 py-2.5 text-[12px] font-medium transition hover:border-[#dfff00] hover:text-[#dfff00]">Masuk</a><button className="grid h-10 w-10 place-items-center rounded-full border border-white/15 md:hidden" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button></div>
        </header>
        <section id="home" className="grid items-center gap-12 pb-12 pt-8 md:grid-cols-[.94fr_1.06fr] md:gap-8 md:pb-[70px] md:pt-[42px]">
          <div className="relative z-10"><span className="inline-flex rounded-full bg-[#dfff00] px-3 py-1.5 text-[10px] font-semibold text-[#17180d]">Sistem Bengkel Modern untuk UMKM</span><h1 className="mt-6 max-w-[590px] text-[clamp(2.7rem,5.2vw,4rem)] font-medium leading-[.99] tracking-[-.065em]">Kelola bengkel lebih mudah, dari stok hingga servis.</h1><p className="mt-6 max-w-[510px] text-[15px] leading-[1.7] text-[#a4a3aa]">Satu platform praktis untuk mengelola spare part, purchase order, work order, dan laporan bisnis KEN-KEN Motor.</p><div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3"><a href="#fitur" className="inline-flex items-center gap-3 rounded-full bg-[#dfff00] py-3 pl-3 pr-6 text-[12px] font-semibold text-[#17180d] transition hover:bg-[#edff66]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#cbe900]"><Icon name="arrow" className="h-4 w-4" /></span>Mulai Kelola Bengkel</a><span className="text-[9px] text-[#77767e]">Gratis untuk mulai · Tanpa kartu kredit</span></div><div className="mt-11 flex max-w-[420px] justify-between gap-4"><div><strong className="block text-[20px] font-bold tracking-[-.03em]">1.248+</strong><span className="mt-1 block text-[10px] text-[#77767e]">Item terkelola</span></div><div><strong className="block text-[20px] font-bold tracking-[-.03em]">98%</strong><span className="mt-1 block text-[10px] text-[#77767e]">Stok lebih akurat</span></div><div><strong className="block text-[20px] font-bold tracking-[-.03em]">12 jam</strong><span className="mt-1 block text-[10px] text-[#77767e]">Hemat waktu / minggu</span></div></div></div>
          <div id="solusi" className="relative mx-auto w-full max-w-[650px] md:ml-auto"><div className="relative flex aspect-[1.12/1] items-center justify-center overflow-visible rounded-[38px] border border-[#3c3b42] bg-[radial-gradient(ellipse_at_53%_55%,#2b2b2d_0%,#202023_52%,#1b1b1d_100%)]"><MotorcycleIllustration /><div className="absolute -right-2 top-[6%] flex items-center gap-3 rounded-2xl bg-[#f5f4f2] px-3.5 py-3 text-black shadow-lg sm:-right-4 sm:px-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f28b]"><Icon name="chart" className="h-5 w-5" /></span><span><small className="block text-[8px] text-[#77767e]">Efisiensi bulan ini</small><strong className="block text-[12px]">+24,8%</strong></span><span className="rounded-full bg-[#e7f5ed] px-2.5 py-2 text-[9px] font-semibold text-[#16885b]">Meningkat</span></div><div className="absolute -bottom-3 left-[-4%] flex items-center gap-3 rounded-2xl bg-[#f5f4f2] px-3.5 py-3 text-black shadow-lg sm:left-[-5%] sm:px-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f28b]"><Icon name="box" className="h-5 w-5" /></span><span><small className="block text-[8px] text-[#77767e]">Oli Mesin MPX 1</small><strong className="block text-[11px]">48 botol tersedia</strong></span><span className="ml-2 h-2 w-2 rounded-full bg-[#16885b]" /></div></div></div>
        </section>
        <section id="fitur" className="grid overflow-hidden rounded-[24px] border border-[#38373d] bg-[#212123] sm:grid-cols-2 lg:grid-cols-4">{features.map((feature, index) => <article key={feature.title} className={`relative px-7 py-7 sm:px-8 sm:py-8 lg:py-9 ${index < features.length - 1 ? 'lg:after:absolute lg:after:bottom-7 lg:after:right-0 lg:after:top-7 lg:after:w-px lg:after:bg-[#3b3a41]' : ''} ${index < 2 ? 'border-b border-[#38373d] lg:border-b-0' : ''} ${index % 2 === 0 ? 'sm:border-r sm:border-[#38373d] lg:border-r-0' : ''}`}><span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#dfff00]/15 text-[#dfff00]"><Icon name={feature.icon} className="h-5 w-5" /></span><h2 className="mt-5 text-[13px] font-semibold tracking-[-.02em]">{feature.title}</h2><p className="mt-2 text-[10px] leading-[1.7] text-[#85848c]">{feature.description}</p></article>)}</section>
        <footer id="tentang" className="flex flex-col gap-3 px-1 pb-3 pt-8 text-[10px] text-[#77767e] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} KEN-KEN Motor</span><span>Solusi manajemen bengkel untuk UMKM</span></footer>
      </div>
    </main>
  )
}

export default HomePage