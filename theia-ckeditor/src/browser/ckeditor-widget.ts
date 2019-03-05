import { inject, injectable } from "inversify"
import { Resource, MaybePromise } from "@theia/core"
import { Navigatable } from "@theia/core/lib/browser/navigatable"
import { BaseWidget, Message } from "@theia/core/lib/browser"
import URI from "@theia/core/lib/common/uri"
import { Workspace, TextDocument } from "@theia/languages/lib/browser"
import { ThemeService } from "@theia/core/lib/browser/theming"
import { EditorPreferences } from "@theia/editor/lib/browser"
import script from "scriptjs"
import "../../src/browser/ckeditor.css"

import debounce from "lodash.debounce"

declare var CKEDITOR: any

export const CKEDITOR_WIDGET_CLASS = "theia-ckeditor-widget"

const DEFAULT_ICON = "fa fa-eye"

let widgetCounter: number = 0

export const CKEditorWidgetOptions = Symbol("CKEditorWidgetOptions")
export interface CKEditorWidgetOptions {
  resource: Resource
}

@injectable()
export class CKEditorWidget extends BaseWidget implements Navigatable {
  readonly uri: URI
  protected readonly resource: Resource

  constructor(
    @inject(CKEditorWidgetOptions)
    protected readonly options: CKEditorWidgetOptions,
    @inject(ThemeService) protected readonly themeService: ThemeService,
    @inject(Workspace) protected readonly workspace: Workspace,
    @inject(EditorPreferences)
    protected readonly editorPreferences: EditorPreferences
  ) {
    super()
    this.resource = this.options.resource
    this.uri = this.resource.uri
    this.id = "ckeditor-widget-" + widgetCounter++
    this.title.closable = true
    this.title.label = `WYSIWYGing ${this.uri.path.base}`
    this.title.caption = this.title.label
    this.title.closable = true

    this.addClass(CKEDITOR_WIDGET_CLASS)
    this.node.tabIndex = 0
    this.title.iconClass = DEFAULT_ICON
    this.initialize()
  }

  async initialize(): Promise<void> {
    console.log("init")
    this.toDispose.push(this.resource)
    if (this.resource.onDidChangeContents) {
      this.toDispose.push(
        this.resource.onDidChangeContents(() => this.update())
      )
    }
    const updateIfAffected = (affectedUri?: string) => {
      if (!affectedUri || affectedUri === this.uri.toString()) {
        this.update()
      }
    }
    this.toDispose.push(
      this.workspace.onDidOpenTextDocument(document =>
        updateIfAffected(document.uri)
      )
    )
    this.toDispose.push(
      this.workspace.onDidChangeTextDocument(params =>
        updateIfAffected(params.textDocument.uri)
      )
    )
    this.toDispose.push(
      this.workspace.onDidCloseTextDocument(document =>
        updateIfAffected(document.uri)
      )
    )
    this.toDispose.push(this.themeService.onThemeChange(() => this.update()))
    this.update()
  }

  onResize() {
    this.ckEditor.resize(
      "100%",
      parseInt(window.getComputedStyle(this.node).height!.replace("px", ""))
    )
  }

  getUri(): URI {
    return this.uri
  }

  getResourceUri(): URI | undefined {
    return this.uri
  }
  createMoveToUri(resourceUri: URI): URI | undefined {
    return this.uri.withPath(resourceUri.path)
  }

  onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg)
    this.node.focus()
    this.update()
  }

  onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg)
    this.performUpdate()
  }

  protected forceUpdate() {
    this.previousContent = ""
    this.update()
  }

  protected previousContent: string | null = null
  protected ckEditor: any | null = null
  protected async performUpdate(): Promise<void> {
    if (!this.resource) {
      return
    }
    const uri = this.resource.uri
    const document = this.workspace.textDocuments.find(
      d => d.uri === uri.toString()
    )
    const content: MaybePromise<string> = document
      ? document.getText()
      : await this.resource.readContents()
    if (content === this.previousContent) {
      return
    }
    this.previousContent = content
    if (this.ckEditor) {
      this.ckEditor.setData(content)
    } else {
      script("https://cdn.ckeditor.com/4.11.3/full/ckeditor.js", () => {
        this.ckEditor = CKEDITOR.appendTo(
          this.node,
          {
            fullPage: true,
            allowedContent: true,
            toolbar: toolbar,
            on: {
              instanceReady: () => this.onResize()
            },
            resize_enabled: false
          },
          content
        )
        this.ckEditor.on("change", () => {
          this.changeCode()
        })
      })
    }
  }

  private changeCode = debounce(this._changeCode, 500)
  protected async _changeCode() {
    const code = this.ckEditor.getData()
    this.previousContent = code
    this.resource.saveContents && this.resource.saveContents(code)
  }
}

const toolbar = [
  {
    name: "document",
    items: ["Save", "NewPage", "Preview", "Print", "-", "Templates"]
  },
  {
    name: "clipboard",
    items: [
      "Cut",
      "Copy",
      "Paste",
      "PasteText",
      "PasteFromWord",
      "-",
      "Undo",
      "Redo"
    ]
  },
  {
    name: "editing",
    items: ["Find", "Replace", "-", "SelectAll", "-", "Scayt"]
  },
  {
    name: "forms",
    items: [
      "Form",
      "Checkbox",
      "Radio",
      "TextField",
      "Textarea",
      "Select",
      "Button",
      "ImageButton",
      "HiddenField"
    ]
  },
  "/",
  {
    name: "basicstyles",
    items: [
      "Bold",
      "Italic",
      "Underline",
      "Strike",
      "Subscript",
      "Superscript",
      "-",
      "CopyFormatting",
      "RemoveFormat"
    ]
  },
  {
    name: "paragraph",
    items: [
      "NumberedList",
      "BulletedList",
      "-",
      "Outdent",
      "Indent",
      "-",
      "Blockquote",
      "CreateDiv",
      "-",
      "JustifyLeft",
      "JustifyCenter",
      "JustifyRight",
      "JustifyBlock",
      "-",
      "BidiLtr",
      "BidiRtl",
      "Language"
    ]
  },
  { name: "links", items: ["Link", "Unlink", "Anchor"] },
  {
    name: "insert",
    items: [
      "Image",
      "Table",
      "HorizontalRule",
      "Smiley",
      "SpecialChar",
      "PageBreak",
      "Iframe"
    ]
  },
  "/",
  {
    name: "styles",
    items: ["Styles", "Format", "Font", "FontSize"]
  },
  { name: "colors", items: ["TextColor", "BGColor"] },
  { name: "tools", items: ["ShowBlocks"] },
  { name: "about", items: ["About"] }
]
