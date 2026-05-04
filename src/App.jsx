import React from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import InfoPanel from './components/InfoPanel'
import SetupWizard from './components/SetupWizard'

const App = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <Sidebar />
      <Canvas />
      <InfoPanel />
      <SetupWizard />
    </div>
  )
}

export default App
