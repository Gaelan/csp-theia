/**
 * Generated using theia-extension-generator
 */

import {
  CommandContribution,
  MenuContribution,
  ResourceProvider
} from "@theia/core/lib/common"
import {
  OpenHandler,
  WidgetFactory,
  FrontendApplicationContribution,
  NavigatableWidgetOptions
} from "@theia/core/lib/browser"
import { TabBarToolbarContribution } from "@theia/core/lib/browser/shell/tab-bar-toolbar"
import URI from "@theia/core/lib/common/uri"
import { CKEditorWidget, CKEditorWidgetOptions } from "./ckeditor-widget"
import { CKEditorURI } from "./ckeditor-uri"
import { CKEditorContribution } from "./ckeditor-contribution"

import { ContainerModule } from "inversify"

export default new ContainerModule(bind => {
  // add your contribution bindings here

  bind(CKEditorWidget).toSelf()
  bind<WidgetFactory>(WidgetFactory)
    .toDynamicValue(ctx => ({
      id: CKEditorURI.id,
      async createWidget(
        options: NavigatableWidgetOptions
      ): Promise<CKEditorWidget> {
        const { container } = ctx
        const resource = await container.get<ResourceProvider>(
          ResourceProvider
        )(new URI(options.uri))
        const child = container.createChild()
        child
          .bind<CKEditorWidgetOptions>(CKEditorWidgetOptions)
          .toConstantValue({ resource })
        return child.get(CKEditorWidget)
      }
    }))
    .inSingletonScope()

  bind(CKEditorContribution)
    .toSelf()
    .inSingletonScope()
  ;[
    CommandContribution,
    MenuContribution,
    OpenHandler,
    FrontendApplicationContribution,
    TabBarToolbarContribution
  ].forEach(serviceIdentifier =>
    bind(serviceIdentifier).toService(CKEditorContribution)
  )
})
