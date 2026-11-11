/**
 * A CSS hex color: #rgb, #rgba, #rrggbb or #rrggbbaa. 5- and 7-digit values
 * aren't valid CSS, and a bad brand color written into a stylesheet silently
 * drops the whole declaration. Shared by the admin form, the admin server
 * function that saves it, and the readers that inject it into the page, so
 * they can never disagree about what counts as valid.
 */
export const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
