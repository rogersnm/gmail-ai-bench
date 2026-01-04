// Tool definitions for Claude to interact with Gmail
// Terminology: "message" = single email, "thread" = conversation with one or more messages

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const gmailTools: ToolDefinition[] = [
  {
    name: 'search_messages',
    description:
      'Search for messages using Gmail search syntax. Returns a list of matching messages with their message_id, thread_id, subject, from, date, and snippet.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Gmail search query (e.g., "from:someone@example.com", "is:unread", "subject:meeting", "newer_than:1d")',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 20, max: 100)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_message',
    description:
      'Get the full content of a single message by its message_id. Returns subject, from, to, date, and full body text.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id of the message to read',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'get_thread',
    description:
      'Get all messages in a thread by thread_id. Use this to read an entire conversation. Returns an array of messages in chronological order.',
    input_schema: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description: 'The thread_id to retrieve all messages from',
        },
      },
      required: ['thread_id'],
    },
  },
  {
    name: 'send_message',
    description: 'Send a new message to recipients.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient address',
        },
        subject: {
          type: 'string',
          description: 'Subject line',
        },
        body: {
          type: 'string',
          description: 'Message body text',
        },
        cc: {
          type: 'string',
          description: 'CC recipient address (optional)',
        },
        bcc: {
          type: 'string',
          description: 'BCC recipient address (optional)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_draft',
    description: 'Create a draft message without sending it. The user can review and send it later.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient address',
        },
        subject: {
          type: 'string',
          description: 'Subject line',
        },
        body: {
          type: 'string',
          description: 'Message body text',
        },
        cc: {
          type: 'string',
          description: 'CC recipient address (optional)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'archive_message',
    description: 'Archive a message (remove from inbox but keep in All Mail). Operates on a single message_id.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id to archive',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'trash_message',
    description: 'Move a message to trash. Operates on a single message_id.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id to trash',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'mark_as_read',
    description: 'Mark a message as read.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id to mark as read',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'mark_as_unread',
    description: 'Mark a message as unread.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id to mark as unread',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'add_label',
    description: 'Add a label to a message. Use get_labels first to find available label IDs.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id to add the label to',
        },
        label_id: {
          type: 'string',
          description: 'The label ID to add (e.g., "STARRED", "IMPORTANT", or custom label ID)',
        },
      },
      required: ['message_id', 'label_id'],
    },
  },
  {
    name: 'remove_label',
    description: 'Remove a label from a message.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message_id to remove the label from',
        },
        label_id: {
          type: 'string',
          description: 'The label ID to remove',
        },
      },
      required: ['message_id', 'label_id'],
    },
  },
  {
    name: 'get_labels',
    description: 'Get a list of all available Gmail labels (including custom labels)',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  // DOM interaction tools - operate on visible threads in the Gmail UI
  {
    name: 'get_visible_threads',
    description:
      'Get information about threads currently visible in the Gmail list view. Returns thread_id, sender, subject, snippet, messageCount, and read/starred status for each visible thread.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'select_threads',
    description:
      'Select one or more threads in the visible Gmail list by checking their checkboxes. Use this before bulk_action.',
    input_schema: {
      type: 'object',
      properties: {
        by: {
          type: 'string',
          enum: ['all', 'none', 'read', 'unread', 'sender', 'subject', 'index'],
          description:
            'Selection method: "all" selects all visible, "none" deselects all, "read"/"unread" selects by read status, "sender"/"subject" matches partial text, "index" selects by position (0-based)',
        },
        value: {
          type: 'string',
          description:
            'For "sender"/"subject": partial text to match. For "index": comma-separated indices (e.g., "0,2,5")',
        },
      },
      required: ['by'],
    },
  },
  {
    name: 'bulk_action',
    description:
      'Perform an action on currently selected threads. Use select_threads first to select threads.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'archive',
            'delete',
            'spam',
            'not_spam',
            'mark_read',
            'mark_unread',
            'star',
            'unstar',
          ],
          description: 'The action to perform on selected threads',
        },
      },
      required: ['action'],
    },
  },
]
