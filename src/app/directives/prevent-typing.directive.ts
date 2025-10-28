import { Directive, HostListener } from '@angular/core';

@Directive({ selector: '[appPreventTyping]' })
export class PreventTypingDirective {
  @HostListener('keydown', ['$event']) onKeydown(e: KeyboardEvent) { e.preventDefault(); }
  @HostListener('paste', ['$event'])   onPaste(e: ClipboardEvent)   { e.preventDefault(); }
  @HostListener('drop', ['$event'])    onDrop(e: DragEvent)         { e.preventDefault(); }
}
