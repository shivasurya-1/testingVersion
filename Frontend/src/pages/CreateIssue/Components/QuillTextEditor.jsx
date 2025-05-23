import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const QuillTextEditor = ({
  label,
  id,
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  required = false,
  requiredFields = [],
  className = "",
  allowPdf = true,
}) => {
  const [editorContent, setEditorContent] = useState(value || "");
  const [pdfFile, setPdfFile] = useState(null);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  const isRequired = required || requiredFields.includes(name);
  
  // Fix the isEmpty check - use useMemo and a safer regex
  const isEmpty = useMemo(() => {
    if (!editorContent) return true;
    
    // Use a safer regex pattern that won't cause infinite recursion
    const textContent = editorContent
      .replace(/<br\s*\/?>/gi, '') // Remove br tags
      .replace(/<p[^>]*><\/p>/gi, '') // Remove empty p tags  
      .replace(/<div[^>]*><\/div>/gi, '') // Remove empty div tags
      .replace(/<[^>]+>/g, '') // Remove all HTML tags (safer pattern)
      .replace(/&nbsp;/g, '') // Remove non-breaking spaces
      .trim();
    
    return textContent === '';
  }, [editorContent]);
  
  const showError = touched && isRequired && isEmpty;

  const handleChange = useCallback((content, delta, source, editor) => {
    // Prevent infinite loops during programmatic updates
    if (source === 'api') return;
    
    setEditorContent(content);
    const syntheticEvent = {
      target: {
        name: name,
        value: content,
      },
    };
    onChange(syntheticEvent);
    if (!touched) setTouched(true);
  }, [name, onChange, touched]);

  const handlePdfChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);

      const syntheticEvent = {
        target: {
          name: `${name}_pdf`,
          value: file,
        },
      };
      onChange(syntheticEvent);
    }
  }, [name, onChange]);

  // Setup image handler and modify toolbar
  useEffect(() => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    
    // Setup image resize module
    if (editor) {
      // Add image resize capability
      editor.getModule('toolbar').addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        
        input.onchange = () => {
          if (input.files != null && input.files[0] != null) {
            const file = input.files[0];
            const reader = new FileReader();
            
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                // Resize image if needed (max 800x600)
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                
                if (width > MAX_WIDTH) {
                  height = (height * MAX_WIDTH) / width;
                  width = MAX_WIDTH;
                }
                
                if (height > MAX_HEIGHT) {
                  width = (width * MAX_HEIGHT) / height;
                  height = MAX_HEIGHT;
                }
                
                // Get current selection or place at end
                const range = editor.getSelection() || { index: editor.getLength() };
                
                // Insert image
                editor.insertEmbed(range.index, 'image', reader.result, 'user');
                
                // Apply styles immediately after insertion
                requestAnimationFrame(() => {
                  const imgElements = editor.root.querySelectorAll('img');
                  const lastImg = imgElements[imgElements.length - 1];
                  
                  if (lastImg && lastImg.src === reader.result) {
                    lastImg.style.maxWidth = '100%';
                    lastImg.style.height = 'auto';
                    lastImg.style.display = 'block';
                    lastImg.style.margin = '10px 0';
                    
                    // Add data attributes for original dimensions
                    lastImg.setAttribute('data-original-width', img.width);
                    lastImg.setAttribute('data-original-height', img.height);
                    
                    // Set dimensions
                    if (width > 0 && height > 0) {
                      lastImg.style.width = `${width}px`;
                      lastImg.style.maxWidth = '100%';
                    }
                  }
                  
                  // Move cursor after the image
                  editor.setSelection(range.index + 1);
                });
              };
              img.src = reader.result;
            };
            reader.readAsDataURL(file);
          }
        };
      });
      
      // Handle pasted images
      editor.clipboard.addMatcher('img', (node, delta) => {
        const img = new Image();
        img.src = node.getAttribute('src');
        
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        
        // Process image dimensions
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
          
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
          
          // Find and update the pasted image
          setTimeout(() => {
            const images = editor.root.querySelectorAll('img');
            const lastImg = images[images.length - 1];
            
            if (lastImg) {
              lastImg.style.maxWidth = '100%';
              lastImg.style.height = 'auto';
              lastImg.style.display = 'block';
              lastImg.style.margin = '10px 0';
              
              if (width > 0 && height > 0) {
                lastImg.style.width = `${width}px`;
                lastImg.style.maxWidth = '100%';
              }
            }
          }, 0);
        };
        
        return delta;
      });
      
      // Handle drag and drop
      editor.root.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          if (e.dataTransfer.files[0].type.match(/^image\//)) {
            e.preventDefault();
            e.stopPropagation();
            
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                // Resize image if needed
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                
                if (width > MAX_WIDTH) {
                  height = (height * MAX_WIDTH) / width;
                  width = MAX_WIDTH;
                }
                
                if (height > MAX_HEIGHT) {
                  width = (width * MAX_HEIGHT) / height;
                  height = MAX_HEIGHT;
                }
                
                // Get drop position and insert image
                const range = editor.getSelection() || { index: editor.getLength() };
                editor.insertEmbed(range.index, 'image', reader.result, 'user');
                
                // Apply dimensions with requestAnimationFrame for better timing
                requestAnimationFrame(() => {
                  const images = editor.root.querySelectorAll('img');
                  const lastImg = images[images.length - 1];
                  
                  if (lastImg && lastImg.src === reader.result) {
                    lastImg.style.maxWidth = '100%';
                    lastImg.style.height = 'auto';
                    lastImg.style.display = 'block';
                    lastImg.style.margin = '10px 0';
                    
                    if (width > 0 && height > 0) {
                      lastImg.style.width = `${width}px`;
                      lastImg.style.maxWidth = '100%';
                    }
                  }
                  
                  // Move cursor after image
                  editor.setSelection(range.index + 1);
                });
              };
              img.src = reader.result;
            };
            reader.readAsDataURL(file);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (value !== undefined && value !== editorContent) {
      // Only update if we're not currently editing
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        if (editor && !editor.hasFocus()) {
          setEditorContent(value);
        }
      } else {
        setEditorContent(value);
      }
    }
  }, [value]);

  useEffect(() => {
    // Handle clicks outside the editor component
    const handleClickOutside = (event) => {
      if (editorRef.current && !editorRef.current.contains(event.target)) {
        setFocused(false);
        if (onBlur) onBlur();
      }
    };

    // Add event listener to document
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onBlur]);

  // Apply custom CSS to fix scroll issues and remove inner border
  useEffect(() => {
    // Apply the styles after the component mounts
    if (quillRef.current) {
      const editorElement = quillRef.current.getEditor().root;
      if (editorElement) {
        // Make sure the content area has fixed height and scrolls
        editorElement.style.height = "220px"; // Adjust based on your needs
        editorElement.style.maxHeight = "220px";
        editorElement.style.overflowY = "auto";
      }
    }
  }, []);

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (onFocus) onFocus();
  }, [onFocus]);

  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      [{ color: [] }, { background: [] }],
      ["clean"],
    ],
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const formats = useMemo(() => [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "link",
    "image",
    "color",
    "background",
  ], []);

  // Custom styles to fix height, scrolling issues, and remove inner borders
  const customStyles = `
    /* Remove inner borders */
    .quill-editor-${id} .ql-container {
      border: none !important;
      height: auto;
      min-height: 100px;
      max-height: 300px;
      overflow: visible;
    }
    
    .quill-editor-${id} .ql-toolbar {
      border: none !important;
      border-bottom: 1px solid #f3f3f3 !important; /* Subtle separator instead of hard border */
      display: flex;
      flex-wrap: wrap;
      padding: 8px 0;
    }
    
    .quill-editor-${id} .ql-editor {
      min-height: 150px;
      max-height: 220px;
      overflow-y: auto !important;
      border: none !important;
    }
    
    /* Create a single outer border appearance */
    .quill-editor-${id} {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    
    /* When focused, change the border color */
    .quill-editor-${id}.focused {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }
    
    /* Image styling */
    .quill-editor-${id} .ql-editor img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 10px 0 !important;
      pointer-events: auto !important;
    }
    
    /* Prevent image removal during re-renders */
    .quill-editor-${id} .ql-editor img[src*="data:image"] {
      opacity: 1 !important;
      visibility: visible !important;
    }
    
    /* Make toolbar buttons more visible */
    .quill-editor-${id} .ql-toolbar button {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    
    .quill-editor-${id} .ql-toolbar button:hover {
      background-color: #f3f3f3;
      border-radius: 3px;
    }
    
    /* Fix spacing in toolbar */
    .quill-editor-${id} .ql-formats {
      margin-right: 10px;
      margin-bottom: 4px;
    }
  `;

  return (
    <div ref={editorRef} className={`${label ? "space-y-4 mb-8" : ""}`}>
      {/* Add custom CSS */}
      <style>{customStyles}</style>

      {label && (
        <div className="flex items-center">
          <label htmlFor={id} className="font-medium flex items-center">
            {label}
            {isRequired && (
              <span className="text-amber-500 ml-1 text-lg">*</span>
            )}
          </label>
        </div>
      )}

      <div
        className={`
           transition-all duration-200 overflow-hidden relative 
          ${error || showError ? "border-red-400 ring-2 ring-red-200" : ""}
          ${className}
          quill-editor-${id}
          ${focused ? "focused" : ""}
        `}
      >
        <div
          className="quill-container"
          style={{ height: "250px", overflow: "hidden" }}
        >
          <ReactQuill
            ref={quillRef}
            id={id}
            theme="snow"
            value={editorContent}
            onChange={handleChange}
            onBlur={() => {
              setTouched(true);
              if (onBlur) onBlur();
            }}
            onFocus={handleFocus}
            modules={modules}
            formats={formats}
            preserveWhitespace={true}
            style={{ height: "280px", border: "none" }}
          />
        </div>
      </div>

      {(showError || error) && (
        <div className="text-red-500 text-sm">{label || name} is required</div>
      )}

      {isRequired && (
        <input
          type="hidden"
          name={name}
          value={editorContent}
          required={true}
          aria-hidden="true"
        />
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        You can paste, drag & drop, or upload images.
      </div>
    </div>
  );
};

export default QuillTextEditor;