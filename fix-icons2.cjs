const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix <Icon   / className="..."> to <Icon className="..." />
  // Fix <Icon className="..."   /> to <Icon className="..." />
  
  content = content.replace(/<([A-Z][a-zA-Z0-9]*)\s+\/\s+className="([^"]+)">/g, '<$1 className="$2" />');
  content = content.replace(/<([A-Z][a-zA-Z0-9]*)\s+className="([^"]+)"\s+\/>/g, '<$1 className="$2" />');
  content = content.replace(/<([A-Z][a-zA-Z0-9]*)\s+className="([^"]+)"\s+>/g, '<$1 className="$2" />');
  
  // Also handle cases where there might be other props
  // e.g. <Upload className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px] text-white"   />
  // This is already valid JSX if it's <Upload className="..." />
  // But wait, the original was <Upload className="text-white" size={20} lg:size={24} />
  // My script made it: <Upload className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px] text-white"   />
  // Wait, if it ends with ` />`, it's valid. But my script might have removed the `/` if it wasn't at the end?
  // Let's check the error: src/components/ProfileModal.tsx(70,24): error TS1005: '>' expected.
  // Line 70: `<X   / className="w-[16px] h-[16px] lg:w-[20px] lg:h-[20px]">`
  // This is invalid JSX because of ` / className="..."`.
  
  content = content.replace(/\s+\/\s+className="([^"]+)">/g, ' className="$1" />');
  content = content.replace(/className="([^"]+)"\s+\/>/g, 'className="$1" />');

  // Let's also fix cases where it might have been `className={'...'} `
  content = content.replace(/\s+\/\s+className=\{([^}]+)\}>/g, ' className={$1} />');
  
  // Let's just do a general fix for ` / className=`
  content = content.replace(/\/\s*className=/g, 'className=');
  
  // And if it ends with `">` instead of `" />` but it's a self-closing tag (like Lucide icons)
  // Actually, `<X className="...">` is valid if it has a closing `</X>`, but icons are self-closing.
  // So if it's `<Icon className="...">` we should make it `<Icon className="..." />`
  // Let's find all Lucide icons that don't end with `/>`
  const icons = ['X', 'Upload', 'ImageIcon', 'LogIn', 'ArrowLeft', 'Star', 'FileText', 'LinkIcon', 'Send', 'Plus', 'Check', 'Trash2', 'Edit2', 'MessageSquare', 'Brain', 'BookOpen', 'MoreVertical', 'GripVertical', 'Search', 'Menu', 'Moon', 'Sun', 'User', 'LogOut', 'Settings', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight', 'Download', 'Share2', 'Maximize2', 'Minimize2', 'ZoomIn', 'ZoomOut', 'RotateCw', 'RotateCcw', 'List', 'Grid', 'Eye', 'EyeOff', 'Save', 'Folder', 'FolderPlus', 'File', 'FilePlus', 'Image', 'Video', 'Music', 'Mic', 'Camera', 'MapPin', 'Calendar', 'Clock', 'Bell', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Star', 'Award', 'Shield', 'Lock', 'Unlock', 'Key', 'Briefcase', 'ShoppingBag', 'ShoppingCart', 'CreditCard', 'DollarSign', 'Percent', 'Tag', 'Bookmark', 'Flag', 'Info', 'HelpCircle', 'AlertCircle', 'AlertTriangle', 'CheckCircle', 'XCircle', 'Play', 'Pause', 'Stop', 'SkipBack', 'SkipForward', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'MicOff', 'VideoOff', 'Wifi', 'WifiOff', 'Bluetooth', 'Battery', 'BatteryCharging', 'Cast', 'Airplay', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Desktop', 'Watch', 'Printer', 'Camera', 'Headphones', 'Speaker', 'Tv', 'Radio', 'Gamepad', 'Joystick', 'Mouse', 'Keyboard', 'HardDrive', 'Database', 'Server', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudLightning', 'CloudDrizzle', 'Sun', 'Moon', 'Star', 'Cloud', 'Umbrella', 'Wind', 'Thermometer', 'Droplet', 'Activity', 'Heart', 'Zap', 'Power', 'Command', 'Option', 'Shift', 'Delete', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUpLeft', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowDownRight', 'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronsUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'List', 'Maximize', 'Minimize', 'Maximize2', 'Minimize2', 'ZoomIn', 'ZoomOut', 'Search', 'Plus', 'Minus', 'X', 'Check', 'Info', 'HelpCircle', 'AlertCircle', 'AlertTriangle', 'CheckCircle', 'XCircle', 'Play', 'Pause', 'Stop', 'SkipBack', 'SkipForward', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Mic', 'MicOff', 'Video', 'VideoOff', 'Camera', 'CameraOff', 'Image', 'Music', 'Headphones', 'Speaker', 'Tv', 'Radio', 'Gamepad', 'Joystick', 'Mouse', 'Keyboard', 'HardDrive', 'Database', 'Server', 'Cloud', 'Wifi', 'WifiOff', 'Bluetooth', 'Battery', 'BatteryCharging', 'Cast', 'Airplay', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Desktop', 'Watch', 'Printer', 'Mail', 'Inbox', 'Send', 'MessageSquare', 'MessageCircle', 'Phone', 'PhoneCall', 'PhoneForwarded', 'PhoneIncoming', 'PhoneMissed', 'PhoneOff', 'PhoneOutgoing', 'Video', 'VideoOff', 'User', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Users', 'Briefcase', 'ShoppingBag', 'ShoppingCart', 'CreditCard', 'DollarSign', 'Percent', 'Tag', 'Bookmark', 'Flag', 'MapPin', 'Map', 'Navigation', 'Navigation2', 'Compass', 'Crosshair', 'Target', 'Calendar', 'Clock', 'Bell', 'BellOff', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Star', 'Award', 'Shield', 'ShieldOff', 'Lock', 'Unlock', 'Key', 'Settings', 'Sliders', 'ToggleLeft', 'ToggleRight', 'Eye', 'EyeOff', 'Save', 'Folder', 'FolderPlus', 'FolderMinus', 'File', 'FilePlus', 'FileMinus', 'FileText', 'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'Bold', 'Italic', 'Underline', 'StrikeThrough', 'Code', 'Terminal', 'Link', 'Link2', 'Paperclip', 'Scissors', 'Copy', 'Clipboard', 'Trash', 'Trash2', 'Edit', 'Edit2', 'Edit3', 'PenTool', 'Type', 'Hash', 'AtSign', 'Percent', 'DollarSign', 'Euro', 'Pound', 'Bitcoin', 'Activity', 'Heart', 'Zap', 'Power', 'Command', 'Option', 'Shift', 'Delete', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUpLeft', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowDownRight', 'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronsUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'List', 'Maximize', 'Minimize', 'Maximize2', 'Minimize2', 'ZoomIn', 'ZoomOut', 'Search', 'Plus', 'Minus', 'X', 'Check', 'Info', 'HelpCircle', 'AlertCircle', 'AlertTriangle', 'CheckCircle', 'XCircle', 'Play', 'Pause', 'Stop', 'SkipBack', 'SkipForward', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Mic', 'MicOff', 'Video', 'VideoOff', 'Camera', 'CameraOff', 'Image', 'Music', 'Headphones', 'Speaker', 'Tv', 'Radio', 'Gamepad', 'Joystick', 'Mouse', 'Keyboard', 'HardDrive', 'Database', 'Server', 'Cloud', 'Wifi', 'WifiOff', 'Bluetooth', 'Battery', 'BatteryCharging', 'Cast', 'Airplay', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Desktop', 'Watch', 'Printer', 'Mail', 'Inbox', 'Send', 'MessageSquare', 'MessageCircle', 'Phone', 'PhoneCall', 'PhoneForwarded', 'PhoneIncoming', 'PhoneMissed', 'PhoneOff', 'PhoneOutgoing', 'Video', 'VideoOff', 'User', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Users', 'Briefcase', 'ShoppingBag', 'ShoppingCart', 'CreditCard', 'DollarSign', 'Percent', 'Tag', 'Bookmark', 'Flag', 'MapPin', 'Map', 'Navigation', 'Navigation2', 'Compass', 'Crosshair', 'Target', 'Calendar', 'Clock', 'Bell', 'BellOff', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Star', 'Award', 'Shield', 'ShieldOff', 'Lock', 'Unlock', 'Key', 'Settings', 'Sliders', 'ToggleLeft', 'ToggleRight', 'Eye', 'EyeOff', 'Save', 'Folder', 'FolderPlus', 'FolderMinus', 'File', 'FilePlus', 'FileMinus', 'FileText', 'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'Bold', 'Italic', 'Underline', 'StrikeThrough', 'Code', 'Terminal', 'Link', 'Link2', 'Paperclip', 'Scissors', 'Copy', 'Clipboard', 'Trash', 'Trash2', 'Edit', 'Edit2', 'Edit3', 'PenTool', 'Type', 'Hash', 'AtSign', 'Percent', 'DollarSign', 'Euro', 'Pound', 'Bitcoin', 'Activity', 'Heart', 'Zap', 'Power', 'Command', 'Option', 'Shift', 'Delete', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUpLeft', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowDownRight', 'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronsUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'List', 'Maximize', 'Minimize', 'Maximize2', 'Minimize2', 'ZoomIn', 'ZoomOut', 'Search', 'Plus', 'Minus', 'X', 'Check', 'Info', 'HelpCircle', 'AlertCircle', 'AlertTriangle', 'CheckCircle', 'XCircle', 'Play', 'Pause', 'Stop', 'SkipBack', 'SkipForward', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Mic', 'MicOff', 'Video', 'VideoOff', 'Camera', 'CameraOff', 'Image', 'Music', 'Headphones', 'Speaker', 'Tv', 'Radio', 'Gamepad', 'Joystick', 'Mouse', 'Keyboard', 'HardDrive', 'Database', 'Server', 'Cloud', 'Wifi', 'WifiOff', 'Bluetooth', 'Battery', 'BatteryCharging', 'Cast', 'Airplay', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Desktop', 'Watch', 'Printer', 'Mail', 'Inbox', 'Send', 'MessageSquare', 'MessageCircle', 'Phone', 'PhoneCall', 'PhoneForwarded', 'PhoneIncoming', 'PhoneMissed', 'PhoneOff', 'PhoneOutgoing', 'Video', 'VideoOff', 'User', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Users', 'Briefcase', 'ShoppingBag', 'ShoppingCart', 'CreditCard', 'DollarSign', 'Percent', 'Tag', 'Bookmark', 'Flag', 'MapPin', 'Map', 'Navigation', 'Navigation2', 'Compass', 'Crosshair', 'Target', 'Calendar', 'Clock', 'Bell', 'BellOff', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Star', 'Award', 'Shield', 'ShieldOff', 'Lock', 'Unlock', 'Key', 'Settings', 'Sliders', 'ToggleLeft', 'ToggleRight', 'Eye', 'EyeOff', 'Save', 'Folder', 'FolderPlus', 'FolderMinus', 'File', 'FilePlus', 'FileMinus', 'FileText', 'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'Bold', 'Italic', 'Underline', 'StrikeThrough', 'Code', 'Terminal', 'Link', 'Link2', 'Paperclip', 'Scissors', 'Copy', 'Clipboard', 'Trash', 'Trash2', 'Edit', 'Edit2', 'Edit3', 'PenTool', 'Type', 'Hash', 'AtSign', 'Percent', 'DollarSign', 'Euro', 'Pound', 'Bitcoin'];
  
  icons.forEach(icon => {
    const regex = new RegExp(`<${icon}\\s+([^>]+?)\\s*(?<!\\/)>`, 'g');
    content = content.replace(regex, `<${icon} $1 />`);
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

const dir = path.join(__dirname, 'src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  processFile(path.join(dir, file));
}
console.log('Done fixing');
