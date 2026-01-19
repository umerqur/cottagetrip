import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import CreateRoom from './pages/CreateRoom'
import JoinRoom from './pages/JoinRoom'
import Room from './pages/Room'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/join" element={<JoinRoom />} />
        <Route path="/room/:code" element={<Room />} />
      </Routes>
    </Router>
  )
}

export default App
