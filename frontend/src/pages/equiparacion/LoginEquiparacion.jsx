import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
export default function LoginEquiparacion(){
  const {login,logout}=useAuth();const navigate=useNavigate();const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  async function submit(e){e.preventDefault();setBusy(true);setError('');const data=new FormData(e.currentTarget)
    try{const r=await login(data.get('email'),data.get('password'));if(!['admin','coordinador'].includes(r.user.rol)){await logout();setError('El registro manual esta disponible para administradores y coordinadores.');return}navigate('/dashboard/equiparacion',{replace:true})}
    catch(e){setError(e.response?.data?.message || 'No se pudo conectar con el servidor')}finally{setBusy(false)}
  }
  return <div className="eq-login"><section className="eq-login-story"><div className="eq-brand"><span className="eq-brand-mark">E</span><div><b>Equiparacion</b><small>CUNOC / INGENIERIA</small></div></div><div><span className="eq-eyebrow">CONTINUIDAD ACADEMICA</span><h1>Un nuevo pensum.<br/>El mismo camino.</h1><p>Gestion de equiparaciones de cursos para la Division de Ciencias de la Ingenieria.</p><div className="eq-login-line">Cursos <span>→</span> Equivalencias <span>→</span> Equiparacion</div></div><small>Centro Universitario de Occidente</small></section><main className="eq-login-main"><form onSubmit={submit}><span className="eq-eyebrow">BIENVENIDO</span><h2>Ingresa a tu espacio</h2><p>Utiliza tu cuenta para gestionar los documentos academicos.</p>{error&&<div className="eq-error" role="alert">{error}</div>}<label>Correo electronico<input name="email" type="email" required autoComplete="username" placeholder="correo@ejemplo.com"/></label><label>Contrasena<input name="password" type="password" required autoComplete="current-password" placeholder="Tu contrasena"/></label><Link to="/forgot-password">Recuperar contrasena</Link><button className="eq-btn primary" disabled={busy}>{busy?'Ingresando...':'Ingresar'}</button></form></main></div>
}
