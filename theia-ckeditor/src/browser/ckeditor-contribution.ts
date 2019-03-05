import { injectable, inject } from "inversify"
import { Widget } from "@phosphor/widgets"
import {
  FrontendApplicationContribution,
  WidgetOpenerOptions,
  NavigatableWidgetOpenHandler
} from "@theia/core/lib/browser"
import {
  EditorManager,
  EditorWidget,
  EditorContextMenu
} from "@theia/editor/lib/browser"
import {
  CommandContribution,
  CommandRegistry,
  Command,
  MenuContribution,
  MenuModelRegistry
} from "@theia/core/lib/common"
import {
  TabBarToolbarContribution,
  TabBarToolbarRegistry
} from "@theia/core/lib/browser/shell/tab-bar-toolbar"
import URI from "@theia/core/lib/common/uri"
import { CKEditorWidget } from "./ckeditor-widget"
import { CKEditorURI } from "./ckeditor-uri"

export namespace CKEditorCommands {
  /**
   * No `label`. Otherwise, it would show up in the `Command Palette` and we already have the `CKEditor` open handler.
   * See in (`WorkspaceCommandContribution`)[https://bit.ly/2DncrSD].
   */
  export const OPEN: Command = {
    id: "ckeditor:open",
    label: "Open WYSIWYG"
  }
  export const OPEN_SOURCE: Command = {
    id: "ckeditor.open.source"
  }
}

export interface CKEditorOpenerOptions extends WidgetOpenerOptions {
  originUri?: URI
}

@injectable()
// tslint:disable-next-line:max-line-length
export class CKEditorContribution
  extends NavigatableWidgetOpenHandler<CKEditorWidget>
  implements
    CommandContribution,
    MenuContribution,
    FrontendApplicationContribution,
    TabBarToolbarContribution {
  readonly id = CKEditorURI.id
  readonly label = "WYSIWYG"

  @inject(EditorManager)
  protected readonly editorManager: EditorManager = undefined as any

  protected readonly synchronizedUris = new Set<string>()

  onStart() {}

  extensionOK(uri: URI) {
    return true
  }

  canHandle(uri: URI): number {
    if (!this.extensionOK(uri)) {
      return 0
    }
    const editorPriority = this.editorManager.canHandle(uri)
    if (editorPriority === 0) {
      return 200
    }
    if (CKEditorURI.match(uri)) {
      return editorPriority * 2
    }
    return editorPriority * (this.openByDefault ? 2 : 0.5)
  }

  protected get openByDefault(): boolean {
    return false
  }

  async open(
    uri: URI,
    options?: CKEditorOpenerOptions
  ): Promise<CKEditorWidget> {
    const resolvedOptions = await this.resolveOpenerOptions(options)
    return super.open(uri, resolvedOptions)
  }
  protected serializeUri(uri: URI): string {
    return super.serializeUri(CKEditorURI.decode(uri))
  }

  protected async resolveOpenerOptions(
    options?: CKEditorOpenerOptions
  ): Promise<CKEditorOpenerOptions> {
    const resolved: CKEditorOpenerOptions = { mode: "activate", ...options }
    if (resolved.originUri) {
      const ref = await this.getWidget(resolved.originUri)
      if (ref) {
        resolved.widgetOptions = { ...resolved.widgetOptions, ref }
      }
    }
    return resolved
  }

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(CKEditorCommands.OPEN, {
      execute: widget => this.openForEditor(widget),
      isEnabled: widget => this.canHandleEditorUri(widget),
      isVisible: widget => this.canHandleEditorUri(widget)
    })
    registry.registerCommand(CKEditorCommands.OPEN_SOURCE, {
      execute: widget => this.openSource(widget),
      isEnabled: widget => widget instanceof CKEditorWidget,
      isVisible: widget => widget instanceof CKEditorWidget
    })
  }

  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(EditorContextMenu.NAVIGATION, {
      commandId: CKEditorCommands.OPEN.id
    })
  }

  registerToolbarItems(registry: TabBarToolbarRegistry): void {
    registry.registerItem({
      id: CKEditorCommands.OPEN.id,
      command: CKEditorCommands.OPEN.id,
      text: "$(eye)",
      tooltip: "Open WYSIWYG to the Side"
    })
    registry.registerItem({
      id: CKEditorCommands.OPEN_SOURCE.id,
      command: CKEditorCommands.OPEN_SOURCE.id,
      text: "$(file-o)",
      tooltip: "Open Source"
    })
  }

  protected canHandleEditorUri(widget?: Widget): boolean {
    const uri = this.getCurrentEditorUri(widget)
    return !!uri && this.extensionOK(uri)
  }

  protected getCurrentEditorUri(widget?: Widget): URI | undefined {
    const current = this.getCurrentEditor(widget)
    return current && current.editor.uri
  }

  protected getCurrentEditor(widget?: Widget): EditorWidget | undefined {
    const current = widget ? widget : this.editorManager.currentEditor
    return (current instanceof EditorWidget && current) || undefined
  }

  protected async openForEditor(widget?: Widget): Promise<void> {
    const ref = this.getCurrentEditor(widget)
    if (!ref) {
      return
    }
    await this.open(ref.editor.uri, {
      mode: "reveal",
      widgetOptions: { ref, mode: "open-to-right" }
    })
  }

  protected async openSource(ref: CKEditorWidget): Promise<EditorWidget>
  protected async openSource(ref?: Widget): Promise<EditorWidget | undefined> {
    if (ref instanceof CKEditorWidget) {
      return this.editorManager.open(ref.uri, {
        widgetOptions: { ref, mode: "open-to-left" }
      })
    }
  }
}
