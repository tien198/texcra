'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { DrawerDepthProvider, useDrawerDepth } from './drawer-depth-provider'

/**
 * Base UI Root wrapper for Document Drawer
 */
function DocumentDrawerRoot({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="document-drawer" {...props} />
}

/**
 * Trigger to open Document Drawer
 */
function DocumentDrawerTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger data-slot="document-drawer-trigger" {...props} />
  )
}

/**
 * Portal wrapper
 */
function DocumentDrawerPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return (
    <DialogPrimitive.Portal data-slot="document-drawer-portal" {...props} />
  )
}

/**
 * Backdrop overlay matching Payload CMS's subtle darkened blur background.
 */
function DocumentDrawerOverlay({
  className,
  forceRender = true,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="document-drawer-overlay"
      forceRender={forceRender}
      className={cn(
        'fixed inset-0 isolate z-50 bg-black/20 transition-all duration-200 supports-backdrop-filter:backdrop-blur-[2px]',
        'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

export interface DocumentDrawerContentProps
  extends DialogPrimitive.Popup.Props {
  showCloseButton?: boolean
  gutterRem?: number
}

/**
 * Sliding content popup replicating Payload CMS drawer cascading dimensions and dark theme.
 */
function DocumentDrawerContent({
  className,
  children,
  showCloseButton = true,
  gutterRem = 3,
  style,
  ...props
}: DocumentDrawerContentProps) {
  const depth = useDrawerDepth()
  const gutterOffset = (depth + 1) * gutterRem
  const zIndex = 50 + depth * 10

  return (
    <DocumentDrawerPortal>
      <DocumentDrawerOverlay style={{ zIndex: zIndex - 1 }} />
      <DialogPrimitive.Popup
        data-slot="document-drawer-content"
        data-depth={depth}
        style={{
          width: `calc(100% - ${gutterOffset}rem)`,
          maxWidth: '100%',
          zIndex,
          ...style,
        }}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-card text-card-foreground shadow-2xl outline-none duration-300 ease-in-out',
          'data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right',
          className,
        )}
        {...props}
      >
        <DrawerDepthProvider>
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="document-drawer-close"
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                />
              }
            >
              <XIcon className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DrawerDepthProvider>
      </DialogPrimitive.Popup>
    </DocumentDrawerPortal>
  )
}

function DocumentDrawerHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="document-drawer-header"
      className={cn(
        'flex flex-col gap-1.5 border-b border-border px-8 py-5 pr-14',
        className,
      )}
      {...props}
    />
  )
}

function DocumentDrawerFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="document-drawer-footer"
      className={cn(
        'mt-auto flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-8 py-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

function DocumentDrawerTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="document-drawer-title"
      className={cn(
        'text-xl font-normal text-foreground leading-tight select-none',
        className,
      )}
      {...props}
    />
  )
}

function DocumentDrawerDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="document-drawer-description"
      className={cn('text-sm text-muted-foreground select-none', className)}
      {...props}
    />
  )
}

function DocumentDrawerClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="document-drawer-close" {...props} />
}

export interface DocumentDrawerProps {
  title?: React.ReactNode
  description?: React.ReactNode
  trigger?: React.ReactNode
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  showCloseButton?: boolean
  gutterRem?: number
  className?: string
  contentClassName?: string
  Header?: React.ReactNode
  Footer?: React.ReactNode
}

/**
 * Convenient all-in-one Document Drawer component matching Payload CMS layout and cascading depth.
 */
export function DocumentDrawer({
  title,
  description,
  trigger,
  children,
  open,
  defaultOpen,
  onOpenChange,
  showCloseButton = true,
  gutterRem = 3,
  className,
  contentClassName,
  Header,
  Footer,
}: DocumentDrawerProps) {
  return (
    <DocumentDrawerRoot
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {trigger && (
        <DocumentDrawerTrigger render={trigger as React.ReactElement} />
      )}
      <DocumentDrawerContent
        showCloseButton={showCloseButton}
        gutterRem={gutterRem}
        className={cn(className, contentClassName)}
      >
        {Header !== undefined ? (
          Header
        ) : title || description ? (
          <DocumentDrawerHeader>
            {title && <DocumentDrawerTitle>{title}</DocumentDrawerTitle>}
            {description && (
              <DocumentDrawerDescription>
                {description}
              </DocumentDrawerDescription>
            )}
          </DocumentDrawerHeader>
        ) : null}

        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>

        {Footer && <DocumentDrawerFooter>{Footer}</DocumentDrawerFooter>}
      </DocumentDrawerContent>
    </DocumentDrawerRoot>
  )
}

export {
  DocumentDrawerRoot,
  DocumentDrawerTrigger,
  DocumentDrawerPortal,
  DocumentDrawerOverlay,
  DocumentDrawerContent,
  DocumentDrawerHeader,
  DocumentDrawerFooter,
  DocumentDrawerTitle,
  DocumentDrawerDescription,
  DocumentDrawerClose,
}
