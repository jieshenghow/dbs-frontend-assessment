import {useState} from 'react'
import OverviewScreen from '@/pages/OverviewScreen'
import TransferDialog from '@/features/transfer/TransferDialog'

export default function App() {
  const [transferOpen, setTransferOpen] = useState(false)

  return (
    <>
      <OverviewScreen onNewTransfer={() => setTransferOpen(true)} />
      {transferOpen && <TransferDialog onClose={() => setTransferOpen(false)} />}
    </>
  )
}
