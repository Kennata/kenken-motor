import { useContext } from 'react'
import AppLayout from '../components/layout/AppLayout'
import Icon from '../components/Icon'
import Link from '../components/Link'
import { Card } from '../components/ui'
import { UserContext } from '../lib/userContext'

const OWNER_LINKS = [
  { title: 'Kelola spare part', description: 'Tambah barang, perbarui harga, dan lihat jumlah stok.', to: '/inventory/spare-parts', icon: 'box' },
  { title: 'Buat purchase order', description: 'Pilih supplier dan spare part yang akan dipesan.', to: '/procurement/purchase-orders', icon: 'cart' },
  { title: 'Terima barang', description: 'Catat jumlah barang yang datang agar stok bertambah.', to: '/procurement/goods-receipts', icon: 'download' },
  { title: 'Pantau laporan', description: 'Tinjau stok, pembelian, pemakaian, dan supplier.', to: '/reports/stock', icon: 'chart' },
]

const MECHANIC_LINKS = [
  { title: 'Cari spare part', description: 'Periksa ketersediaan dan jumlah stok barang.', to: '/inventory/spare-parts', icon: 'box' },
  { title: 'Data kendaraan', description: 'Cari atau catat kendaraan pelanggan.', to: '/bengkel/vehicles', icon: 'truck' },
  { title: 'Kelola work order', description: 'Buat pekerjaan servis dan perbarui statusnya.', to: '/bengkel/work-orders', icon: 'wrench' },
  { title: 'Catat pemakaian', description: 'Tambahkan spare part yang digunakan ke work order.', to: '/bengkel/spare-part-usage', icon: 'clipboard' },
]

const FAQS = [
  { question: 'Bagaimana mencatat stok masuk?', answer: 'Buka Procurement → Penerimaan Barang, pilih purchase order, isi jumlah yang benar-benar diterima, lalu konfirmasi. Backend memperbarui stok berdasarkan penerimaan tersebut.' },
  { question: 'Kapan stok berkurang?', answer: 'Stok berkurang saat spare part ditambahkan ke work order. Periksa Daftar Spare Part atau menu Stok Keluar untuk melihat perubahan.' },
  { question: 'Bagaimana mengubah batas minimum stok?', answer: 'Owner dapat membuka Pengaturan → Minimum Stok, mengubah angka pada barang, lalu pilih Simpan Perubahan. Peringatan muncul saat stok sama dengan atau di bawah batas itu.' },
  { question: 'Mengapa saya tidak bisa membuka beberapa menu?', answer: 'Akses mengikuti role akun. Owner dapat mengelola procurement, laporan, pengaturan, dan stok. Mekanik menggunakan fitur spare part dan operasional bengkel sesuai hak akses backend.' },
]

function HelpPage() {
  const user = useContext(UserContext)
  const isOwner = user?.role === 'owner'
  const links = isOwner ? OWNER_LINKS : MECHANIC_LINKS

  return <AppLayout title="Bantuan" subtitle="Panduan singkat menggunakan KEN-KEN Motor.">
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-5 !border-[#252527] !bg-[#18181a] !text-white sm:p-7">
        <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-[#dfff00]/15 px-3 py-1.5 text-[10px] font-medium text-[#e4ff48]"><Icon name="help" className="h-3.5 w-3.5"/>Panduan {isOwner ? 'Owner' : 'Mekanik'}</span><h2 className="mt-4 text-[21px] font-semibold tracking-[-.03em]">Halo{user?.name ? `, ${user.name}` : ''}. Mulai dari sini.</h2><p className="mt-2 text-[11px] leading-relaxed text-white/65">Pilih pintasan sesuai pekerjaan Anda. Data pada halaman operasional tersimpan melalui API backend dengan hak akses akun Anda.</p></div>
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#dfff00] text-[#18181a]"><Icon name={isOwner ? 'settings' : 'wrench'} className="h-8 w-8"/></span>
      </Card>

      <section>
        <div className="mb-3"><h2 className="text-[15px] font-semibold">Pintasan untuk {isOwner ? 'Owner' : 'Mekanik'}</h2><p className="mt-1 text-[10px] text-[#77767e]">Buka langsung fitur yang sering digunakan.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{links.map((item) => <Link key={item.to} to={item.to} className="group rounded-[18px] border border-[#e5e5e8] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#d5df78] hover:shadow-[0_12px_28px_rgba(20,20,25,.07)]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dfff00]/30 text-[#303300]"><Icon name={item.icon} className="h-5 w-5"/></span><span className="mt-4 flex items-center justify-between gap-2 text-[12px] font-semibold text-[#222226]">{item.title}<Icon name="arrow" className="h-4 w-4 -rotate-45 text-[#77767e] transition group-hover:text-[#657000]"/></span><span className="mt-1.5 block text-[10px] leading-relaxed text-[#77767e]">{item.description}</span></Link>)}</div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <Card><h2 className="text-[15px] font-semibold">Alur kerja bengkel</h2><p className="mt-1 text-[10px] text-[#77767e]">Urutan umum agar data stok dan servis tercatat rapi.</p><ol className="mt-5 space-y-4">{(isOwner ? [
          ['Siapkan katalog dan supplier', 'Pastikan spare part, satuan, harga, supplier, dan minimum stok sudah sesuai.'],
          ['Buat dan kirim purchase order', 'Catat pesanan kepada supplier dari menu Purchase Order.'],
          ['Konfirmasi barang diterima', 'Masukkan jumlah aktual pada Penerimaan Barang; stok diperbarui oleh backend.'],
          ['Pantau stok dan laporan', 'Gunakan laporan untuk meninjau transaksi serta barang yang perlu dipesan kembali.'],
        ] : [
          ['Cari kendaraan pelanggan', 'Pilih Data Kendaraan untuk mencari kendaraan atau mencatat kendaraan baru.'],
          ['Buat work order', 'Catat keluhan dan pekerjaan servis, lalu perbarui status pengerjaan.'],
          ['Catat spare part yang dipakai', 'Tambahkan item ke work order agar pemakaian dan pengurangan stok tercatat.'],
          ['Periksa hasil pekerjaan', 'Pastikan work order dan penggunaan spare part sudah sesuai sebelum menyelesaikan servis.'],
        ]).map(([title, description], index) => <li key={title} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#dfff00]/35 text-[10px] font-bold text-[#424900]">{index + 1}</span><div><h3 className="text-[11px] font-semibold">{title}</h3><p className="mt-1 text-[10px] leading-relaxed text-[#77767e]">{description}</p></div></li>)}</ol></Card>

        <Card><h2 className="text-[15px] font-semibold">Pertanyaan umum</h2><div className="mt-3 divide-y divide-[#ececef]">{FAQS.map((item) => <details key={item.question} className="group py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-medium text-[#33333a]">{item.question}<Icon name="chevronDown" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"/></summary><p className="mt-2 pr-5 text-[10px] leading-relaxed text-[#77767e]">{item.answer}</p></details>)}</div></Card>
      </div>
    </div>
  </AppLayout>
}

export default HelpPage
