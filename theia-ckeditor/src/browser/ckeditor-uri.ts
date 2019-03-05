import URI from "@theia/core/lib/common/uri"

export namespace CKEditorURI {
  export const id = "code-editor-ckeditor"
  export const param = "open-handler=" + id
  export function match(uri: URI): boolean {
    return uri.query.indexOf(param) !== -1
  }
  export function encode(uri: URI): URI {
    if (match(uri)) {
      return uri
    }
    const query = [param, ...uri.query.split("&")].join("&")
    return uri.withQuery(query)
  }
  export function decode(uri: URI): URI {
    if (!match(uri)) {
      return uri
    }
    const query = uri.query
      .split("&")
      .filter(p => p !== param)
      .join("&")
    return uri.withQuery(query)
  }
}
