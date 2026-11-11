import AppLayout from '../components/layout/AppLayout'
import Icon from '../components/Icon'
import { Card } from '../components/ui'

function ComingSoonPage({ title, roles = ['owner'] }) {
  return (
    <AppLayout title={title} roles={roles}>
      <Card className="grid min-h-[50vh] place-items-center text-center">
        <div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#18181a] text-[#dfff00]"><Icon name="clipboard" /></span>
          <p className="mt-4 text-[15px] font-semibold">Halaman {title} sedang dikembangkan</p>
          <p className="mt-1 text-[11px] text-[#77767e]">Modul ini dikerjakan oleh anggota tim lain dan akan tersedia segera.</p>
        </div>
      </Card>
    </AppLayout>
  )
}

export default ComingSoonPage
