using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;

namespace Playground;

public class Startup
{
    public void ConfigureServices(IServiceCollection services) => services.AddControllers().AddNewtonsoftJson();

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(Path.Combine(env.ContentRootPath, "webapp/dist"))
        });
        app.UseRouting();
        app.UseEndpoints(endpoints => endpoints.MapControllers());
    }
}