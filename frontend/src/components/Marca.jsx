import { Link } from 'react-router'
import logo from '../assets/logo.png'

function Marca({ aoClicar }) {
  return (
    <Link to="/" className="marca" onClick={aoClicar}>
      <img src={logo} alt="" className="marca-logo" width="36" height="36" />
      Ferramentaria
    </Link>
  )
}

export default Marca
