import { Route, Routes, BrowserRouter } from 'react-router-dom'
import { Main } from './components/main/Main'
import { GoogleAuthCallbackPage } from './feat/auth/pages/GoogleAuthCallbackPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route
          path="/auth/google/callback"
          element={<GoogleAuthCallbackPage />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
