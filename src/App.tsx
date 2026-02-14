import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toPng } from 'html-to-image'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

function App() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('NOTEPAD')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [isSplitView, setIsSplitView] = useState(false)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isResizing, setIsResizing] = useState(false)
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false)
  const [showImageWidthOptions, setShowImageWidthOptions] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
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
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const scrollRatioRef = useRef(0)
  const cursorPosRef = useRef<{ start: number; end: number } | null>(null)

  const isSyncingLeftScroll = useRef(false)
  const isSyncingRightScroll = useRef(false)
  const shouldAutoScrollRef = useRef(false)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    if (e.target.selectionStart === e.target.value.length) {
      shouldAutoScrollRef.current = true
    }
  }

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && splitContainerRef.current) {
      const containerRect = splitContainerRef.current.getBoundingClientRect()
      const newRatio = (e.clientX - containerRect.left) / containerRect.width
      const clampedRatio = Math.min(Math.max(newRatio, 0.2), 0.8)
      setSplitRatio(clampedRatio)
    }
  }, [isResizing])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    } else {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing, resize, stopResizing])

  useLayoutEffect(() => {
    if (shouldAutoScrollRef.current) {
      if (editorRef.current) {
        editorRef.current.scrollTop = editorRef.current.scrollHeight
      }
      if (previewRef.current) {
        previewRef.current.scrollTop = previewRef.current.scrollHeight
      }
      shouldAutoScrollRef.current = false
    }
  }, [text])

  const handleEditorScroll = () => {
    if (!isSplitView || !editorRef.current || !previewRef.current) return
    if (isSyncingRightScroll.current) {
      isSyncingRightScroll.current = false
      return
    }

    isSyncingLeftScroll.current = true
    const { scrollTop, scrollHeight, clientHeight } = editorRef.current
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
    
    const previewScrollTop = scrollPercentage * (previewRef.current.scrollHeight - previewRef.current.clientHeight)
    previewRef.current.scrollTop = previewScrollTop
  }

  const handlePreviewScroll = () => {
    if (!isSplitView || !editorRef.current || !previewRef.current) return
    if (isSyncingLeftScroll.current) {
      isSyncingLeftScroll.current = false
      return
    }

    isSyncingRightScroll.current = true
    const { scrollTop, scrollHeight, clientHeight } = previewRef.current
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
    
    const editorScrollTop = scrollPercentage * (editorRef.current.scrollHeight - editorRef.current.clientHeight)
    editorRef.current.scrollTop = editorScrollTop
  }

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
    } else if (!isPreview && !isSplitView && editorRef.current) {
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
    } else if (isSplitView && editorRef.current) {
      // Restore cursor and scroll position for split view
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
  }, [isPreview, isSplitView])

  const handleToggleSplitView = () => {
    if (!isSplitView && editorRef.current) {
      const { scrollTop, scrollHeight, clientHeight, selectionStart, selectionEnd } = editorRef.current
      const maxScroll = scrollHeight - clientHeight
      scrollRatioRef.current = maxScroll > 0 ? scrollTop / maxScroll : 0
      cursorPosRef.current = { start: selectionStart, end: selectionEnd }
    } else if (isSplitView && editorRef.current) {
      const { scrollTop, scrollHeight, clientHeight, selectionStart, selectionEnd } = editorRef.current
      const maxScroll = scrollHeight - clientHeight
      scrollRatioRef.current = maxScroll > 0 ? scrollTop / maxScroll : 0
      cursorPosRef.current = { start: selectionStart, end: selectionEnd }
    }
    
    if (isSplitView) {
      setIsPreview(true)
    } else {
      if (isPreview) setIsPreview(false)
    }
    
    setIsSplitView(!isSplitView)
    setIsDownloadMenuOpen(false)
    setShowImageWidthOptions(false)
  }

  const markdownComponents = useMemo(() => ({
    code({node, inline, className, children, ...props}: any) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <div className="relative pt-6">
          <div className="absolute left-0 top-0 text-xs text-gray-400 dark:text-gray-500 font-mono select-none pointer-events-none">
            {match[1].toUpperCase()}
          </div>
          <SyntaxHighlighter
            style={isDarkMode ? oneDark : oneLight}
            language={match[1].toLowerCase()}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '0.375rem', background: 'transparent' }}
            codeTagProps={{ style: { backgroundColor: 'transparent' } }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
    a({node, className, children, ...props}: any) {
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        const href = props.href
        if (href && href.startsWith('#')) {
          e.preventDefault()
          const id = href.slice(1)
          const element = document.getElementById(decodeURIComponent(id))
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }

      if ('data-footnote-backref' in props) {
        return (
          <a
            className={`${className || ''} no-underline ml-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors`}
            aria-label="Back to content"
            onClick={handleClick}
            {...props}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor" 
              className="w-3 h-3 inline-block align-super"
            >
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </a>
        )
      }
      return (
        <a className={className} onClick={handleClick} {...props}>
          {children}
        </a>
      )
    },
    h2({node, className, children, ...props}: any) {
      if (props.id === 'footnote-label') {
        return null
      }
      return <h2 className={className} {...props}>{children}</h2>
    },
    section({node, className, children, ...props}: any) {
      if ('data-footnotes' in props) {
        return (
          <section 
            className={`${className || ''} mt-12 pt-6 border-t border-gray-200 dark:border-gray-800`} 
            {...props}
          >
            {children}
          </section>
        )
      }
      return <section className={className} {...props}>{children}</section>
    }
  }), [isDarkMode])

  const handleTogglePreview = () => {
    if (isSplitView) {
      if (editorRef.current) {
        const { scrollTop, scrollHeight, clientHeight, selectionStart, selectionEnd } = editorRef.current
        const maxScroll = scrollHeight - clientHeight
        scrollRatioRef.current = maxScroll > 0 ? scrollTop / maxScroll : 0
        cursorPosRef.current = { start: selectionStart, end: selectionEnd }
      }
      setIsSplitView(false)
      setIsPreview(false)
    } else {
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
    setIsDownloadMenuOpen(false)
    setShowImageWidthOptions(false)
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

  const handleDownloadMD = () => {
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.md`
    a.click()
    URL.revokeObjectURL(url)
    setIsDownloadMenuOpen(false)
    setShowImageWidthOptions(false)
  }


  const handleDownloadPDF = () => {
    if (!previewRef.current) return
    setIsDownloadMenuOpen(false)
    setShowImageWidthOptions(false)

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) return

    doc.title = title

    const base = doc.createElement('base')
    base.href = window.location.href
    doc.head.appendChild(base)

    Array.from(document.head.children).forEach(child => {
      if (child.tagName === 'STYLE' || child.tagName === 'LINK') {
        doc.head.appendChild(child.cloneNode(true))
      }
    })

    const printStyle = doc.createElement('style')
    printStyle.textContent = `
      @page { size: A4; margin: 20mm; }
      body { 
        background-color: white !important;
        color: black !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Ensure the prose container takes full width of the print area */
      .prose { 
        max-width: none !important; 
        width: 100% !important;
        color: #374151 !important; /* gray-700 */
      }
      .prose h1, .prose h2, .prose h3, .prose h4 {
        color: #111827 !important; /* gray-900 */
      }
      /* Fix link colors for print */
      a { color: #2563eb !important; text-decoration: none !important; }
      /* Hide scrollbars */
      ::-webkit-scrollbar { display: none; }
    `
    doc.head.appendChild(printStyle)

    const contentWrapper = doc.createElement('div')
    contentWrapper.className = 'prose prose-slate max-w-none'
    contentWrapper.innerHTML = previewRef.current.innerHTML
    
    doc.body.appendChild(contentWrapper)

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 2000)
    }, 500)
  }

  const handleDownloadImage = async () => {
    setShowImageWidthOptions(true)
  }

  const executeImageDownload = async (width: number) => {
    if (!previewRef.current) return
    setIsDownloading(true)
    try {
      const clone = previewRef.current.cloneNode(true) as HTMLElement

      clone.classList.remove('text-lg')
      clone.classList.remove('prose')
      clone.classList.add('prose')

      if (width >= 2560) {
        clone.classList.add('text-5xl')
        clone.classList.add('prose-2xl')
      } else if (width >= 1920) {
        clone.classList.add('text-4xl')
        clone.classList.add('prose-2xl')
      } else if (width >= 1200) {
        clone.classList.add('text-3xl')
        clone.classList.add('prose-xl')
      } else if (width >= 800) {
        clone.classList.add('text-2xl')
        clone.classList.add('prose-lg')
      } else {
        clone.classList.add('text-xl')
        clone.classList.add('prose-lg')
      }

      clone.style.width = `${width}px`
      clone.style.height = 'auto'
      clone.style.overflow = 'visible'
      clone.style.maxHeight = 'none'
      clone.style.position = 'absolute'
      clone.style.top = '0'
      clone.style.left = '0'
      clone.style.zIndex = '-9999'

      document.body.appendChild(clone)

      const height = clone.scrollHeight

      const dataUrl = await toPng(clone, {
        width: width,
        height: height,
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
        pixelRatio: 1,
        cacheBust: true,
      })

      document.body.removeChild(clone)

      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${title}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      console.error('Download failed', e)
      alert('Failed to generate image. Please check console for details.')
    } finally {
      setIsDownloading(false)
      setIsDownloadMenuOpen(false)
      setShowImageWidthOptions(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-white dark:bg-[#18181b] flex flex-col font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 overflow-hidden transition-colors duration-300">
      {isDownloading && (
        <div className="fixed inset-0 z-50 bg-black/20 dark:bg-white/10 cursor-wait" onClick={(e) => e.stopPropagation()}></div>
      )}
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
            {(isPreview || isSplitView) && (
              <>
                <div className="relative">
                  <button
                    onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    className={`transition-colors cursor-pointer outline-none ${isDownloadMenuOpen ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                  >
                    DOWNLOAD
                  </button>

                  {isDownloadMenuOpen && (
                    <div className="absolute top-1/2 right-full -translate-y-1/2 mr-4 flex items-center space-x-4 z-20">
                      {!showImageWidthOptions ? (
                        <>
                          <button
                            onClick={handleDownloadMD}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            .MD
                          </button>
                          <button
                            onClick={handleDownloadPDF}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            .PDF
                          </button>
                          <button
                            onClick={handleDownloadImage}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            .PNG
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-300 dark:text-gray-600 font-bold text-xs select-none">
                            WIDTH
                          </span>
                          <button
                            onClick={() => executeImageDownload(600)}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            600px
                          </button>
                          <button
                            onClick={() => executeImageDownload(800)}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            800px
                          </button>
                          <button
                            onClick={() => executeImageDownload(1200)}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            1200px
                          </button>
                          <button
                            onClick={() => executeImageDownload(1920)}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            1920px
                          </button>
                          <button
                            onClick={() => executeImageDownload(2560)}
                            className="transition-colors cursor-pointer outline-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 whitespace-nowrap"
                          >
                            2560px
                          </button>
                          <button
                            onClick={() => setShowImageWidthOptions(false)}
                            className="transition-colors cursor-pointer outline-none text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 whitespace-nowrap text-[10px]"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleToggleSplitView}
                  className={`transition-colors cursor-pointer outline-none ${isSplitView ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                >
                  SPLIT
                </button>
              </>
            )}
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTogglePreview}
              className={`transition-colors cursor-pointer outline-none ${isPreview || isSplitView ? 'text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 font-bold' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
            >
              MARKDOWN
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
        {isSplitView ? (
          <div ref={splitContainerRef} className="flex flex-1 w-full overflow-hidden">
            <textarea
              ref={editorRef}
              onScroll={handleEditorScroll}
              style={{ width: `${splitRatio * 100}%` }}
              className="px-8 md:px-12 py-6 resize-none outline-none text-gray-700 dark:text-gray-300 leading-relaxed text-lg placeholder-gray-200 dark:placeholder-gray-700 font-sans bg-transparent border-r border-gray-200 dark:border-gray-800 no-scrollbar"
              placeholder=""
              value={text}
              onChange={handleTextChange}
              spellCheck={false}
              autoFocus
            />
            
            {/* Draggable Divider */}
            <div
              className="w-1 cursor-col-resize hover:bg-indigo-500 active:bg-indigo-600 bg-transparent transition-colors z-10 flex-shrink-0 -ml-0.5"
              onMouseDown={startResizing}
            />

            <div 
              ref={previewRef}
              onScroll={handlePreviewScroll}
              style={{ width: `${(1 - splitRatio) * 100}%` }}
              className="px-8 md:px-12 py-6 overflow-y-auto text-gray-700 dark:text-gray-300 leading-relaxed text-lg font-sans bg-transparent prose prose-slate dark:prose-invert max-w-none"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{text}</ReactMarkdown>
            </div>
          </div>
        ) : isPreview ? (
          <div 
            ref={previewRef}
            className="flex-1 w-full px-8 md:px-12 py-6 overflow-y-auto text-gray-700 dark:text-gray-300 leading-relaxed text-lg font-sans bg-transparent prose prose-slate dark:prose-invert max-w-none"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{text}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={editorRef}
            className="flex-1 w-full px-8 md:px-12 py-6 resize-none outline-none text-gray-700 dark:text-gray-300 leading-relaxed text-lg placeholder-gray-200 dark:placeholder-gray-700 font-sans bg-transparent"
            placeholder=""
            value={text}
            onChange={handleTextChange}
            spellCheck={false}
            autoFocus
          />
        )}
      </div>
    </div>
  )
}

export default App
