# RemoteUi

RemoteUi is a plugin that makes it easier to build complex form editors using .NET and React.

## Getting Started

Add the following lines of code to your ASP .NET controller or RPC:

```cs
// Define the C# models.
public class Contacts
{
    [RemoteUiField("Phone", Descripton = "Your phone number.")] 
    public string Phone { get; set; }
    
    [RemoteUiField("Skype", Description = "Your Skype username.")]
    public string Skype { get; set; }
}

// Define the C# DTO used for generating remote UI.
public class ContactsResponse
{
    // This property denotes the definition used to build a RemoteUi
    // editor, the definition is generated using RemoteUiBuilder<T>.
    public JObject Definition { get; set; }

    // This property denotes the model that is used to populate
    // RemoteUi editor fields. In other words, this model contains
    // default property values for the RemoteUi editor.
    public Contacts Value { get; set; }
}

// Create a new RemoteUi builder. Register all of your custom nested
// models here, that are used in your model tree.
var noFields = new IExtraRemoteUiField[0];
var builder = new RemoteUiBuilder<Contacts>(noFields)
    .Register<Contacts>(noFields);
    
// Return the response from your controller or RPC.
return Ok(new ContactsResponse
{
    Definition = builder.Build(null),
    Value = new Contacts
    {
        Phone = "12345",
        Skype = "@skype"
    }
});
```

Add the following lines to your client React app:

```tsx
import * as React from "react"
import * as ReactDOM from "react-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import { RemoteUiEditor } from "@remoteui/RemoteUiEditor";
import { RemoteUiEditorStore, RemoteUiDefinition } from "@remoteui/RemoteUiEditorStore";
import { observer } from "mobx-react";
import { observable } from "mobx";

// Define the Typescript models.
interface Contacts {
    phone: string;
    skype: string;
}

// Define the API response.
interface ContactsResponse {
    definition: RemoteUiDefinition;
    value: Contacts;
}

// Fetch the response and populate the store. 
const response: ContactsResponse = await fetch(...);
const store = new RemoteUiEditorStore(response.definition, response.value);

// Display the editor form for the data received from the C# server.
const App = observer((props: { }) => {
    return <RemoteUiEditor store={store} />
});

const root = document.createElement("div");
document.body.append(root);
ReactDOM.render(<App />, root);

// To validate and send the save request containing the modified
// Contacts model to the server, extract the form data as follows:
const contacts = await store.getDataAsync();
```

## Features

