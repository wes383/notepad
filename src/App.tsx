import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function App() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('NOTEPAD')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const scrollRatioRef = useRef(0)
  const cursorPosRef = useRef<{ start: number; end: number } | null>(null)
  const skipBlurRef = useRef(false)

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

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
    // Capture current scroll ratio and cursor position before switching
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="w-full max-w-6xl flex flex-col h-[85vh] transition-all duration-300 border border-black">
        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center sticky top-0 z-10 select-none bg-white border-b border-black">
          {/* Title */}
          <div className="flex-1 flex items-center">
            {isEditingTitle && !isPreview ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                className="text-xs font-medium text-gray-500 tracking-wider bg-transparent outline-none w-48"
              />
            ) : (
              <div 
                onMouseDown={() => skipBlurRef.current = true}
                onClick={() => !isPreview && setIsEditingTitle(true)}
                className={`text-xs font-medium text-gray-300 tracking-wider ${!isPreview ? 'cursor-pointer hover:text-gray-500' : 'cursor-default'} transition-colors`}
              >
                {title}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-400 font-mono">
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTogglePreview}
              className={`transition-colors cursor-pointer outline-none ${isPreview ? 'text-gray-900 hover:text-gray-700 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {isPreview ? 'EDIT' : 'PREVIEW'}
            </button>
            <span>{text.length} chars</span>
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className={`transition-colors cursor-pointer outline-none focus:text-red-600 ${text.length > 0 ? 'hover:text-red-500 text-gray-400' : 'text-gray-200 cursor-default'}`}
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
            onClick={() => {
              if (!window.getSelection()?.toString()) {
                handleTogglePreview()
              }
            }}
            className="flex-1 w-full px-5 py-6 overflow-y-auto text-gray-700 leading-relaxed text-lg font-sans bg-transparent prose prose-slate max-w-none cursor-pointer"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={editorRef}
            className="flex-1 w-full px-5 py-6 resize-none outline-none text-gray-700 leading-relaxed text-lg placeholder-gray-200 font-sans bg-transparent"
            placeholder=""
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (skipBlurRef.current) {
                skipBlurRef.current = false
                return
              }
              handleTogglePreview()
            }}
            spellCheck={false}
            autoFocus
          />
        )}
      </div>
    </div>
  )
}

export default App
