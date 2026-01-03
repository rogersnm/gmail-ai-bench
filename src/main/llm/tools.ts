// Tool definitions for Claude to interact with Gmail

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
    name: 'search_emails',
    description:
      'Search for emails in Gmail using Gmail search syntax. Returns a list of matching emails with subject, from, date, and snippet.',
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
          description: 'Maximum number of emails to return (default: 20, max: 100)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_email',
    description: 'Read the full content of a specific email by its ID. Returns subject, from, to, date, and full body text.',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email to read',
        },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'send_email',
    description: 'Send a new email. Use this to compose and send emails to recipients.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body text',
        },
        cc: {
          type: 'string',
          description: 'CC recipient email address (optional)',
        },
        bcc: {
          type: 'string',
          description: 'BCC recipient email address (optional)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_draft',
    description: 'Create a draft email without sending it. The user can review and send it later.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body text',
        },
        cc: {
          type: 'string',
          description: 'CC recipient email address (optional)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'archive_email',
    description: 'Archive an email (remove from inbox but keep in All Mail)',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email to archive',
        },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'trash_email',
    description: 'Move an email to trash',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email to trash',
        },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'mark_as_read',
    description: 'Mark an email as read',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email to mark as read',
        },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'mark_as_unread',
    description: 'Mark an email as unread',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email to mark as unread',
        },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'add_label',
    description: 'Add a label to an email. You MUST use get_labels first to find available label IDs.',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email',
        },
        label_id: {
          type: 'string',
          description: 'The ID of the label to add (e.g., "STARRED", "IMPORTANT", or custom label ID)',
        },
      },
      required: ['email_id', 'label_id'],
    },
  },
  {
    name: 'remove_label',
    description: 'Remove a label from an email',
    input_schema: {
      type: 'object',
      properties: {
        email_id: {
          type: 'string',
          description: 'The ID of the email',
        },
        label_id: {
          type: 'string',
          description: 'The ID of the label to remove',
        },
      },
      required: ['email_id', 'label_id'],
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
  // DOM interaction tools
  {
    name: 'select_emails',
    description:
      'Select one or more emails in the visible Gmail list by checking their checkboxes. Use this before bulk_action.',
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
      'Perform an action on currently selected emails. Use select_emails first to select emails.',
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
          description: 'The action to perform on selected emails',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'get_visible_emails',
    description:
      'Get information about emails currently visible in the Gmail inbox view. Returns sender, subject, snippet, and status for each email.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
]
