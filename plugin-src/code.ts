figma.showUI(__html__, { width: 400, height: 800 });

figma.ui.onmessage = msg => {
    if (msg.type === 'generate-code') {
        const nodes = figma.currentPage.selection;
        const outputType = msg.outputType;
        let codeOutput = '';

        nodes.forEach(node => {
            codeOutput += convertNodeToCode(node, outputType);
        });

        figma.ui.postMessage({ type: 'code-generated', codeOutput });
    }
};

function convertNodeToCode(node: SceneNode, outputType: string): string {
    let style = '';
    let classes = '';
    
    if (outputType === 'tailwind') {
        classes = convertStylesToTailwind(extractStyles(node));
    } else {
        style = extractStyles(node);
    }

    let result = '';
    const childrenCode = node.children ? node.children.map(child => convertNodeToCode(child as SceneNode, outputType)).join('') : '';
    
    if (node.type === 'TEXT') {
        result = generateTextCode(node as TextNode, outputType);
    } else {
        if (outputType === 'tailwind') {
            result = `<div class="${node.name.replace(/\s+/g, '')} ${classes}">${childrenCode}</div>`;
        } else {
            result = `<div class="${node.name.replace(/\s+/g, '')}" style="${style}">${childrenCode}</div>`;
        }
    }
    return result;
}

function generateTextCode(node: TextNode, outputType: string): string {
    let style = '';
    let classes = '';

    const textStyle = extractTextStyles(node);
    
    if (outputType === 'tailwind') {
        classes = convertStylesToTailwind(textStyle);
    } else {
        style = textStyle;
    }
    
    const formattedText = node.characters.replace(/\n/g, '<br>'); // Convert new lines to <br> tags

    if (outputType === 'tailwind') {
        return `<div class="${node.name.replace(/\s+/g, '')} ${classes}">${formattedText}</div>`;
    } else {
        return `<div class="${node.name.replace(/\s+/g, '')}" style="${style}">${formattedText}</div>`;
    }
}


function extractTextStyles(node: TextNode): string {
    let styles = `color: ${getColor(node.fills)}; font-size: ${node.fontSize}px; `;
    styles += `font-family: '${node.fontName.family}', sans-serif; font-weight: ${node.fontName.style}; `;
    styles += `text-align: ${node.textAlignHorizontal}; white-space: pre-wrap; `;
    if (node.textDecoration === 'UNDERLINE') {
        styles += 'text-decoration: underline; ';
    }
    // Explicitly handle width and height for text blocks
    if ('width' in node && 'height' in node) {
        styles += `width: ${node.width}px; height: ${node.height}px; `;
    }

    // Apply absolute positioning if the parent is a FRAME with no auto-layout
    if (node.parent && node.parent.type === 'FRAME' && (node.parent as FrameNode).layoutMode === 'NONE') {
        styles += `position: absolute; left: ${node.x}px; top: ${node.y}px; `;
    }

    return styles;
}

function extractStyles(node: SceneNode): string {
    let styles = '';
    if ('width' in node) {
        styles += `width: ${node.width}px; `;
    }
    if ('height' in node) {
        styles += `height: ${node.height}px; `;
    }

    if ('fills' in node && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
        const fill = node.fills[0] as SolidPaint;
        styles += `background: rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.opacity || 1}); `;
    }

    if (node.type !== 'TEXT' && node.parent && node.parent.type === 'FRAME' && node.parent.layoutMode === 'NONE') {
        styles += `position: absolute; left: ${node.x}px; top: ${node.y}px; `;
    }

    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        styles += `display: flex; flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'}; `;
        if ('primaryAxisAlignItems' in node) {
            styles += `justify-content: ${convertAlignmentToFigma(node.primaryAxisAlignItems)}; `;
        }
        if ('counterAxisAlignItems' in node) {
            styles += `align-items: ${convertAlignmentToFigma(node.counterAxisAlignItems)}; `;
        }
        if ('itemSpacing' in node) {
            styles += `gap: ${node.itemSpacing}px; `;
        }
    }

    return styles;
}

function getColor(fills: ReadonlyArray<Paint>): string {
    if (fills.length > 0 && fills[0].type === 'SOLID') {
        const fill = fills[0] as SolidPaint;
        return `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.opacity || 1})`;
    }
    return 'transparent';
}

function convertAlignmentToFigma(alignment: string): string {
    const alignmentMap = {
        'MIN': 'flex-start',
        'CENTER': 'center',
        'MAX': 'flex-end',
        'SPACE_BETWEEN': 'space-between'
    };
    return alignmentMap[alignment] || 'initial';
}


function convertStylesToTailwind(style: string): string {
    const rules = style.split(';').filter(Boolean);
    let classes = '';
    
    rules.forEach(rule => {
        const [key, value] = rule.split(':').map(part => part.trim());
        if (!value) return;
        switch (key) {
            case 'width':
                classes += `w-[${value.replace('px', '')}px] `;
                break;
            case 'height':
                classes += `h-[${value.replace('px', '')}px] `;
                break;
            case 'background':
                classes += convertColorToTailwind(value);
                break;
            case 'position':
                classes += `${value} `;
                break;
            case 'left':
                classes += `left-[${value.replace('px', '')}px] `;
                break;
            case 'top':
                classes += `top-[${value.replace('px', '')}px] `;
                break;
            case 'display':
                classes += `${value} `;
                break;
            case 'flex-direction':
                classes += `flex-${value === 'row' ? 'row' : 'col'} `;
                break;
            case 'justify-content':
                classes += `justify-${convertFlexAlignment(value)} `;
                break;
            case 'align-items':
                classes += `items-${convertFlexAlignment(value)} `;
                break;
            case 'gap':
                classes += `gap-[${value.replace('px', '')}px] `;
                break;
        }
    });

    return classes.trim();
}


function convertColorToTailwind(rgba: string): string {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d*\.?\d+)?\)/);
    if (!match) return '';

    const [r, g, b, a = 1] = match.slice(1).map(Number);
    // Ideally, map RGB values to nearest Tailwind colors or define custom colors in your tailwind.config.js
    const opacity = Math.round(a * 100);
    // Placeholder: 
    const color = `bg-opacity-${opacity} bg-[rgba(${r},${g},${b},${a})] `;
    return color;
}

// Helper function to convert CSS flex alignment values to Tailwind classes
function convertFlexAlignment(value: string): string {
    const map = {
        'flex-start': 'start',
        'flex-end': 'end',
        'center': 'center',
        'space-between': 'between',
        'space-around': 'around',
        'space-evenly': 'evenly'
    };
    return map[value] || 'start';
}
