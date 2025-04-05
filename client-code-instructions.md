# Client-Side Code Instructions

Based on the CORS error message, you need to update your client-side code that's making the fetch request to the API. Here's how to modify your code in the client application:

## 1. Update the fetch request in api.ts

Look for the `downloadGeneratedStack` function in your api.ts file (around line 31, based on the error message). Update it to include CORS mode and credentials:

```typescript
export async function downloadGeneratedStack(frontend: string, backend: string) {
  try {
    const response = await fetch(
      `http://localhost:3001/generate-stack?frontend=${frontend}&backend=${backend}`, 
      {
        method: 'GET',
        // Add these options to handle CORS properly
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Accept': 'application/zip',
        },
      }
    );
    
    if (!response.ok) {
      // Check if response is JSON (error) or binary (zip file)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Parse error response
        const errorData = await response.json();
        
        // Special handling for "coming soon" stacks
        if (errorData.status === 'coming_soon') {
          // You can show a special UI for "coming soon" templates
          throw new Error(`${errorData.message}`);
        } else {
          throw new Error(`API error: ${errorData.message}`);
        }
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    }
    
    // Create a blob from the response
    const blob = await response.blob();
    
    // Create a download link and trigger it
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${frontend}-${backend}.zip`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}
```

## 2. Frontend UI for "Coming Soon" Templates

You can modify your UI to show visual indicators for templates that are in development:

```typescript
// Example function to check if a stack is implemented or just visible in UI
function isStackImplemented(frontend: string, backend: string) {
  // This should match your server-side implemented list
  const implementedStacks = ['react-express'];
  return implementedStacks.includes(`${frontend}-${backend}`);
}

// In your UI component:
{stacks.map(stack => (
  <StackOption 
    key={stack.id}
    stack={stack}
    // Add a "coming soon" badge/overlay for non-implemented stacks
    comingSoon={!isStackImplemented(stack.frontend, stack.backend)}
    // You might want to allow selection but show info instead of downloading
    onClick={handleStackSelection}
  />
))}
```

## 3. Alternative Approach - Use a streamed download

If you're still having issues, try using a different approach that doesn't rely on the fetch API's CORS handling:

```typescript
export function downloadGeneratedStack(frontend: string, backend: string) {
  // Create a hidden iframe to handle the download
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  // Set the source to your API endpoint
  iframe.src = `http://localhost:3001/generate-stack?frontend=${frontend}&backend=${backend}`;
  
  // Clean up after a delay
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 5000);
  
  return Promise.resolve(true);
}
```

## 4. Server restart required

After making changes to the server's CORS configuration, make sure to restart your server for the changes to take effect. 