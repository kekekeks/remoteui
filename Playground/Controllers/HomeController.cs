using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;
using RemoteUi;

namespace Playground.Controllers;

[Route("")]
public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly RemoteUiBuilder<Dto> _info;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;

        // Old example
        var oldInfo = new RemoteUiBuilder(typeof(Dto), null, null, new SnakeCaseNamingStrategy())
            .Register(typeof(DtoBase), null, "Test");
            
        _info = new RemoteUiBuilder<Dto>(null, null, new SnakeCaseNamingStrategy())
            .Register<DtoBase>(null, "Test")
            .Register<ReadOnlyDtoBase>()
            .Register<ReadOnlyInnerDto>();
    }

    [HttpGet("")]
    public IActionResult Index() => Redirect("/index.html");

    [HttpGet("description")]
    public object GetDescription() => _info.Build(null);

    [HttpGet("initial")]
    public object GetObject() =>
        new JsonResult(new Dto
        {
            SomeString = "Sample Text",
            ReadOnlyExample = new ReadOnlyDtoBase
            {
                ListOfReadOnlyStrings = new List<ReadOnlyInnerDto>
                {
                    new()
                    {
                        Title = "One"
                    },
                    new()
                    {
                        Title = "Two"
                    },
                } 
            }
        }, _info.GetSerializerSettings());

    [HttpPost("validate")]
    public object Validate([FromBody] Dto data)
    {
        _logger.LogInformation(JObject.FromObject(data).ToString(Formatting.Indented));
        return new JsonResult(new
        {
            SomeString = "Error in string",
            ListOfStrings = new[]
            {
                null, "Error in second element"
            },
            ListOfObjects = new object[]
            {
                new
                {
                    SomeString = "Error in first object"
                },
                new
                {
                    ListStrings = new[] {"Error in second object"}
                }
            }
        }, _info.GetSerializerSettings());
    }
}

public class Dto : DtoBase { }

[RemoteUiFieldGroup("", "Common")]
public class DtoBase
{
    [RemoteUiField("List of strings")]
    public List<string> ListOfStrings { get; set; }
        
    [RemoteUiField("Overided ID List", Id = "OverrideMe")]
    [JsonProperty("OverrideMe")]
    public List<string> OverrideList { get; set; } = new() { "123321" };
        
    [RemoteUiField("SomeString")]
    public string SomeString { get; set; }
        
    [RemoteUiField("ListOfObjects")]
    public List<DtoBase> ListOfObjects { get; set; }
        
    [RemoteUiField("Some float")]
    public decimal SomeFloat { get; set; }

    [RemoteUiField("Read Only Model", ReadOnly = true)]
    public ReadOnlyDtoBase ReadOnlyExample { get; set; }
}

public class ReadOnlyDtoBase
{
    [RemoteUiField("Read only string", ReadOnly = true)]
    public string ReadOnlyString { get; set; }

    [RemoteUiField("List of read only strings", ReadOnly = true, ListType = typeof(ReadOnlyInnerDto))]
    public List<ReadOnlyInnerDto> ListOfReadOnlyStrings { get; set; }
}

public class ReadOnlyInnerDto
{
    [RemoteUiField("Read only title", ReadOnly = true)]
    public string Title { get; set; }
}