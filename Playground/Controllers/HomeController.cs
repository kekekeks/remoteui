﻿using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RemoteUi;

namespace Playground.Controllers
{
    [Route("")]
    public class HomeController : Controller
    {
        private RemoteUiBuilder _info;
        public HomeController()
        {
            _info = new RemoteUiBuilder(typeof(Dto), null).Register(typeof(DtoBase), null, "Test");
        }
        [HttpGet("")]
        public IActionResult Index()
        {
            return Redirect("/index.html");
        }

        [HttpGet("description")]
        public object GetDescription() => _info.Build(null);

        [HttpGet("initial")]
        public object GetObject() => new JsonResult(new Dto(), _info.GetSerializerSettings());

        [HttpPost("validate")]
        public object Validate([FromBody] Dto data)
        {

            return new JsonResult(new
            {
                SomeString = "Error in string",
                ListOfStrings = new[]
                {
                    null, "Error in second element"
                },
                ListOfObjects = new object[]
                {
                    new {SomeString = "Error in first object"},
                    new {ListStrings = new[] {"Error in second object"}}
                }
            }, _info.GetSerializerSettings());
        }
    }

    public class Dto : DtoBase
    {
        
    }
    
    [RemoteUiFieldGroup("", "Common")]
    public class DtoBase
    {
        [RemoteUiField("List of strings")]
        public List<string> ListOfStrings { get; set; }
        
        [RemoteUiField("SomeString")]
        public string SomeString { get; set; }
        
        [RemoteUiField("ListOfObjects")]
        public List<DtoBase> ListOfObjects { get; set; }
        
        [RemoteUiField("Some float")]
        public decimal SomeFloat { get; set; }
    }
}