'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Heading2, Minus, Undo, Redo } from 'lucide-react'

interface Props {
  content: object | null
  readOnly?: boolean
  onChange?: (json: object) => void
  placeholder?: string
}

export default function NoteEditor({ content, readOnly = false, onChange, placeholder }: Props) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Scrivi qui la tua nota…' }),
    ],
    content: content || '',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getJSON())
    },
  })

  // Sincronizza content esterno (es. cambio nota selezionata)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentJson = JSON.stringify(editor.getJSON())
      const newJson = JSON.stringify(content)
      if (currentJson !== newJson) {
        editor.commands.setContent(content || '')
      }
    }
  }, [editor, content])

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly)
  }, [editor, readOnly])

  if (!editor) return null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50 flex-wrap">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Grassetto"><Bold size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Corsivo"><Italic size={14} /></ToolBtn>
          <span className="w-px h-4 bg-gray-200 mx-1" />
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Titolo"><Heading2 size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista puntata"><List size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerata"><ListOrdered size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Separatore"><Minus size={14} /></ToolBtn>
          <span className="w-px h-4 bg-gray-200 mx-1" />
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Annulla"><Undo size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Ripristina"><Redo size={14} /></ToolBtn>
        </div>
      )}
      {/* Contenuto editor */}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto px-4 py-3 prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  )
}

function ToolBtn({ onClick, active, title, children }: { onClick: () => void; active: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className={`p-1.5 rounded transition ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
    >
      {children}
    </button>
  )
}
