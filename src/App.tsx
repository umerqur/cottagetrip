import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import CreateRoom from './pages/CreateRoom'
import JoinRoom from './pages/JoinRoom'
import Room from './pages/Room'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
