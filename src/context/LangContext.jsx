import { createContext, useContext, useState, useEffect } from 'react'
import translations from '../i18n/translations'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('faya_lang') || 'EN')

  const switchLang = (l) => {
    setLang(l)
    localStorage.setItem('faya_lang', l)
  }

  const t = (key) => translations[lang][key] || key

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
