import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function App() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('NOTEPAD')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })
  const titleInputRef = useRef<HTMLInputElement>(null)
  
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const scrollRatioRef = useRef(0)
  const cursorPosRef = useRef<{ start: number; end: number } | null>(null)
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    document.title = title
  }, [title])

  useLayoutEffect(() => {
    if (isPreview && previewRef.current) {
      const { scrollHeight, clientHeight } = previewRef.current
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll > 0) {
        previewRef.current.scrollTop = scrollRatioRef.current * maxScroll
      }
    } else if (!isPreview && editorRef.current) {
      const { scrollHeight, clientHeight } = editorRef.current
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll > 0) {
        editorRef.current.scrollTop = scrollRatioRef.current * maxScroll
      }
      
      if (cursorPosRef.current) {
        editorRef.current.setSelectionRange(cursorPosRef.current.start, cursorPosRef.current.end)
        cursorPosRef.current = null
      }
      editorRef.current.focus()
    }
  }, [isPreview])

  const handleTogglePreview = () => {
    if (!isPreview && editorRef.current) {
      const { scrollTop, scrollHeight, clientHeight, selectionStart, selectionEnd } = editorRef.current
      const maxScroll = scrollHeight - clientHeight
      scrollRatioRef.current = maxScroll > 0 ? scrollTop / maxScroll : 0
      cursorPosRef.current = { start: selectionStart, end: selectionEnd }
    } else if (isPreview && previewRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = previewRef.current
      const maxScroll = scrollHeight - clientHeight
      scrollRatioRef.current = maxScroll > 0 ? scrollTop / maxScroll : 0
    }
    setIsPreview(!isPreview)
  }

  const handleClear = () => {
    if (text.length > 0) {
      setText('')
    }
  }

  const handleTitleSubmit = () => {
    setIsEditingTitle(false)
    if (title.trim() === '') {
      setTitle('NOTEPAD')
    }
  }

  const toggleTheme = () => setIsDarkMode(!isDarkMode)

  return (
    <div className="h-screen w-screen bg-white dark:bg-[#18181b] flex flex-col font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 overflow-hidden transition-colors duration-300">
      <div className="w-full h-full flex flex-col transition-all duration-300">
        {/* Header */}
        <div className="px-8 md:px-12 py-4 flex justify-between items-center sticky top-0 z-10 select-none bg-white dark:bg-[#18181b] border-b border-black dark:border-white/20 transition-colors duration-300">
          {/* Title */}
          <div className="flex-1 flex items-center">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                maxLength={50}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider bg-transparent outline-none w-48"
              />
            ) : (
              <div 
                onClick={() => setIsEditingTitle(true)}
                className="text-xs font-medium text-gray-300 dark:text-gray-600 tracking-wider cursor-pointer hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
              >
                {title}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-400 dark:text-gray-500 font-mono">
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTogglePreview}
              className={`transition-colors cursor-pointer outline-none ${isPreview ? 'text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 font-bold' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
            >
              {isPreview ? 'EDIT' : 'MARKDOWN'}
            </button>
            <button 
              onClick={toggleTheme}
              className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              {isDarkMode ? 'LIGHT' : 'DARK'}
            </button>
            <span>{text.length} chars</span>
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className={`transition-colors cursor-pointer outline-none focus:text-red-600 dark:focus:text-red-400 ${text.length > 0 ? 'hover:text-red-500 dark:hover:text-red-400 text-gray-400 dark:text-gray-500' : 'text-gray-200 dark:text-gray-700 cursor-default'}`}
              disabled={text.length === 0}
            >
              CLEAR
            </button>
          </div>
        </div>
        
        {/* Editor / Preview Area */}
        {isPreview ? (
          <div 
            ref={previewRef}
            className="flex-1 w-full px-8 md:px-12 py-6 overflow-y-auto text-gray-700 dark:text-gray-300 leading-relaxed text-lg font-sans bg-transparent prose prose-slate dark:prose-invert max-w-none"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={editorRef}
            className="flex-1 w-full px-8 md:px-12 py-6 resize-none outline-none text-gray-700 dark:text-gray-300 leading-relaxed text-lg placeholder-gray-200 dark:placeholder-gray-700 font-sans bg-transparent"
            placeholder=""
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoFocus
          />
        )}
      </div>
    </div>
  )
}

export default App
